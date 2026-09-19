from rest_framework import exceptions


class InvalidSupabaseToken(exceptions.AuthenticationFailed):
    status_code = 401
    default_detail = "Invalid or expired authentication token."
    default_code = "AUTHENTICATION_FAILED"
