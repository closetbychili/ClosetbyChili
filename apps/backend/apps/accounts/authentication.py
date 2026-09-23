"""DRF authentication backed by Supabase Auth JWTs.

Design
------
``SupabaseJWTAuthentication.authenticate()`` does two things:

1. **Verify the JWT** — always, on every request.  Uses HS256 when
   ``SUPABASE_JWT_SECRET`` is set (no network call), or RS256/ES* via the
   Supabase JWKS endpoint otherwise.

2. **Resolve the application User** — read-first, write-only-when-needed:
   * Happy path (existing user): one indexed SELECT by ``supabase_user_id``.
     No write; no transaction.
   * First-time user (SIGNED_IN / new device): ``get_or_create`` inside a
     transaction, plus profile row creation.
   * Email change: update only when the stored email differs from the JWT claim.

This keeps the hot path (authenticated GET requests from returning users) to a
single read-only DB round trip.

JWKS
----
``_jwks_client()`` is only called when ``SUPABASE_JWT_SECRET`` is **absent**.
The ``@lru_cache`` ensures the JWKS endpoint is only fetched once per process
(refreshed after ``lifespan`` seconds).  In a test environment that sets
``SUPABASE_JWT_SECRET`` to any truthy value the JWKS client is never
instantiated and no outbound HTTPS traffic is attempted.
"""

from __future__ import annotations

import logging
import os
import re
from functools import lru_cache

import jwt
from django.db import transaction
from rest_framework.authentication import BaseAuthentication
from rest_framework.request import Request

from apps.accounts.exceptions import InvalidSupabaseToken
from apps.accounts.models import CustomerProfile, User

logger = logging.getLogger(__name__)

_PLACEHOLDER_HOST_RE = re.compile(
    r"^(https?://)?"
    r"(your-project|example|placeholder|invalid|test|undefined|null|)"
    r"\.supabase\.co",
    re.IGNORECASE,
)


def _looks_like_placeholder(url: str) -> bool:
    return bool(url and _PLACEHOLDER_HOST_RE.match(url.rstrip("/")))


def _require_valid_http_url(value: str, env_name: str) -> None:
    if not value:
        raise InvalidSupabaseToken(
            f"{env_name} is not configured. Set it in your environment to enable "
            "Supabase JWT verification."
        )
    if not (value.startswith("http://") or value.startswith("https://")):
        raise InvalidSupabaseToken(
            f"{env_name} must start with http:// or https://. Got: {value!r}"
        )
    if _looks_like_placeholder(value):
        raise InvalidSupabaseToken(
            f"{env_name} appears to still be set to its placeholder value "
            f"({value!r}). Replace it with your real Supabase project URL."
        )


def _supabase_url() -> str:
    return os.environ.get("SUPABASE_URL", "").rstrip("/")


def _issuer() -> str:
    configured = os.environ.get("SUPABASE_JWT_ISSUER")
    if configured:
        return configured.rstrip("/")
    base = _supabase_url()
    return f"{base}/auth/v1" if base else ""


def _audience() -> str:
    return os.environ.get("SUPABASE_JWT_AUDIENCE", "authenticated")


@lru_cache(maxsize=1)
def _jwks_client() -> jwt.PyJWKClient:
    """Return a cached JWKS client.

    Only called when ``SUPABASE_JWT_SECRET`` is not configured.  The
    ``@lru_cache`` makes this a one-time setup per worker process; subsequent
    key refreshes are handled transparently by PyJWKClient's internal cache
    (``lifespan=300`` seconds).
    """
    jwks_url = os.environ.get("SUPABASE_JWKS_URL") or (
        f"{_supabase_url()}/auth/v1/.well-known/jwks.json" if _supabase_url() else ""
    )

    _require_valid_http_url(jwks_url, "SUPABASE_JWKS_URL or SUPABASE_URL")

    logger.info(
        "SUPABASE_JWT_SECRET is not set; verifying Supabase JWTs via JWKS at %s",
        jwks_url,
    )

    try:
        return jwt.PyJWKClient(
            jwks_url, cache_jwk_set=True, lifespan=300, timeout=5
        )
    except (ValueError, OSError) as exc:
        logger.exception("Failed to initialise Supabase JWKS client: %s", exc)
        raise InvalidSupabaseToken(
            "Supabase JWT verification could not be configured: "
            "JWKS endpoint is unreachable. Set SUPABASE_URL and SUPABASE_JWKS_URL "
            "to your real project, or configure SUPABASE_JWT_SECRET to use HS256."
        ) from exc


def _decode_token(token: str) -> dict:
    """Verify and decode a Supabase JWT.  Returns the verified claims dict.

    Verification path:
    * HS256 via ``SUPABASE_JWT_SECRET`` — no network I/O.
    * RS256 / ES* via JWKS — one network call per worker lifetime (cached).
    """
    secret = os.environ.get("SUPABASE_JWT_SECRET", "")
    issuer = _issuer()
    audience = _audience()

    if not issuer:
        raise InvalidSupabaseToken(
            "Supabase JWT issuer is not configured. Set SUPABASE_URL or "
            "SUPABASE_JWT_ISSUER to your real Supabase project."
        )

    try:
        if secret:
            # Fast path: symmetric HS256 — no remote key fetch required.
            claims = jwt.decode(
                token,
                secret,
                algorithms=["HS256"],
                audience=audience,
                issuer=issuer,
                options={"require": ["sub", "exp", "iat"]},
            )
        else:
            # JWKS path: only entered when SUPABASE_JWT_SECRET is absent.
            try:
                signing_key = _jwks_client().get_signing_key_from_jwt(token)
            except jwt.exceptions.PyJWKClientError as exc:
                if "ConnectionError" in type(exc).__name__ or isinstance(
                    getattr(exc, "__cause__", None), OSError
                ):
                    logger.exception(
                        "JWKS key lookup failed due to connectivity: %s", exc
                    )
                    raise InvalidSupabaseToken(
                        "JWT verification failed: could not reach the Supabase JWKS "
                        "endpoint. Verify SUPABASE_URL/SUPABASE_JWKS_URL are correct "
                        "and the server has outbound HTTPS access, or set "
                        "SUPABASE_JWT_SECRET to use HS256 verification."
                    ) from exc
                logger.exception("JWKS key lookup failed: %s", exc)
                raise InvalidSupabaseToken(
                    "JWT verification failed: JWKS lookup error"
                    f" ({type(exc).__name__})."
                ) from exc

            algorithm = jwt.get_unverified_header(token).get("alg")
            if algorithm not in {"RS256", "ES256", "ES384", "ES512"}:
                raise InvalidSupabaseToken(
                    "Unsupported Supabase JWT signing algorithm."
                )
            claims = jwt.decode(
                token,
                signing_key.key,
                algorithms=[algorithm],
                audience=audience,
                issuer=issuer,
                options={"require": ["sub", "exp", "iat"]},
            )
    except InvalidSupabaseToken:
        raise
    except (jwt.PyJWTError, ValueError, OSError) as exc:
        logger.exception(
            "Supabase JWT verification failed: %s",
            type(exc).__name__,
        )
        raise InvalidSupabaseToken(
            f"JWT verification failed: {type(exc).__name__}"
        ) from exc

    subject = claims.get("sub")
    if not subject:
        raise InvalidSupabaseToken("Authentication token has no subject.")
    try:
        uuid_subject = str(subject)
        __import__("uuid").UUID(uuid_subject)
    except (ValueError, AttributeError) as exc:
        raise InvalidSupabaseToken(
            "Authentication token has an invalid subject."
        ) from exc
    return claims


def _resolve_user(claims: dict) -> User:
    """Return the application User for the given verified JWT claims.

    Hot path (returning user)
    -------------------------
    Attempts a read-only ``SELECT`` by ``supabase_user_id``.  If the user
    exists and their stored email matches the JWT claim, this is the only DB
    operation — no transaction, no write.

    Cold path (new user / first login)
    ------------------------------------
    Falls back to ``get_or_create`` inside a transaction, plus profile row.

    Email sync
    ----------
    Updates the stored email only when it has actually changed, keeping the
    ``updated_at`` timestamp stable for unchanged rows.
    """
    from uuid import UUID

    subject = UUID(str(claims["sub"]))
    email = str(claims.get("email") or "")[:254]
    user_metadata = claims.get("user_metadata") or {}
    display_name = str(
        user_metadata.get("full_name")
        or user_metadata.get("name")
        or claims.get("name")
        or ""
    )[:150]

    # ── Hot path: read-only lookup ────────────────────────────────────────
    try:
        user = User.objects.select_related("profile").get(supabase_user_id=subject)
    except User.DoesNotExist:
        user = None

    if user is not None:
        if not user.is_active:
            raise InvalidSupabaseToken("This application account is inactive.")

        # Update email only when it has actually changed.
        if email and user.email != email:
            user.email = email
            user.save(update_fields=["email", "updated_at"])

        # Ensure profile row exists (guard against partial legacy data).
        try:
            profile = user.profile
        except CustomerProfile.DoesNotExist:
            profile = CustomerProfile.objects.create(user=user)

        if display_name and profile.display_name != display_name:
            profile.display_name = display_name
            profile.save(update_fields=["display_name", "updated_at"])

        return user

    # ── Cold path: first login — provision user + profile ────────────────
    with transaction.atomic():
        user, _ = User.objects.get_or_create(
            supabase_user_id=subject,
            defaults={"email": email},
        )
        if not user.is_active:
            raise InvalidSupabaseToken("This application account is inactive.")

        # Sync email if it was set after creation (race with get_or_create).
        if email and user.email != email:
            user.email = email
            user.save(update_fields=["email", "updated_at"])

        profile, _ = CustomerProfile.objects.get_or_create(user=user)
        if display_name and profile.display_name != display_name:
            profile.display_name = display_name
            profile.save(update_fields=["display_name", "updated_at"])

    return user


class SupabaseJWTAuthentication(BaseAuthentication):
    """Authenticate Bearer access tokens issued by Supabase Auth."""

    keyword = "Bearer"

    def authenticate(self, request: Request):
        header = request.headers.get("Authorization", "")
        if not header:
            return None

        parts = header.split()
        if len(parts) != 2 or parts[0].lower() != self.keyword.lower():
            raise InvalidSupabaseToken(
                "Authorization header must use Bearer authentication."
            )

        claims = _decode_token(parts[1])
        user = _resolve_user(claims)
        return user, claims

    def authenticate_header(self, request: Request) -> str:
        return self.keyword
