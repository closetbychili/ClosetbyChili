"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Package,
  Heart,
  MapPin,
  LogOut,
  Edit3,
  X,
  Check,
  Loader2,
  User,
  Phone,
  Mail,
  AlertCircle,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/components/AuthProvider";
import { updateCurrentProfile } from "@/lib/api/auth";
import { ApiClientError } from "@/lib/api/client";

function getInitials(name: string, fallback: string): string {
  const trimmed = (name || "").trim();
  const source = trimmed.length > 0 ? trimmed : fallback;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "C";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

type SaveStatus =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

export default function AccountPage() {
  const router = useRouter();
  const { user, loading, signOut, refreshUser } = useAuth();

  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<SaveStatus>({ kind: "idle" });

  const initials = useMemo(
    () =>
      getInitials(
        (editing ||
          status.kind === "loading" ||
          status.kind === "success" ||
          status.kind === "error"
          ? displayName
          : user?.profile.display_name) || "",
        user?.email ?? ""
      ),
    [editing, status.kind, displayName, user?.profile.display_name, user?.email]
  );

  const greetingName = useMemo(() => {
    const liveName = editing ? displayName : user?.profile.display_name ?? displayName;
    const n = (liveName || "").trim();
    if (n.length > 0) return n;
    if (user?.email) {
      const local = user.email.split("@")[0];
      return local.charAt(0).toUpperCase() + local.slice(1);
    }
    return null;
  }, [user, displayName, editing]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  function beginEdit() {
    setStatus({ kind: "idle" });
    setDisplayName(user?.profile.display_name ?? "");
    setPhone(user?.profile.phone ?? "");
    setEditing(true);
  }

  function cancelEdit() {
    setDisplayName(user?.profile.display_name ?? "");
    setPhone(user?.profile.phone ?? "");
    setStatus({ kind: "idle" });
    setEditing(false);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ kind: "loading" });
    setEditing(false);

    try {
      const updated = await updateCurrentProfile({
        display_name: displayName.trim(),
        phone: phone.trim(),
      });
      setDisplayName(updated.profile.display_name ?? "");
      setPhone(updated.profile.phone ?? "");
      setStatus({
        kind: "success",
        message: "Your profile has been updated.",
      });
      await refreshUser();
      setTimeout(() => setStatus({ kind: "idle" }), 4000);
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : "Something went wrong saving your changes. Please try again.";
      setStatus({ kind: "error", message });
      setEditing(true);
    }
  }

  async function handleSignOut() {
    await signOut();
    router.push("/");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-ivory pt-36 text-center">
        <div className="inline-flex items-center gap-2 text-sm text-black/60">
          <Loader2 size={16} className="animate-spin text-chili" />
          Loading your account…
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-ivory px-4 sm:px-6 pb-24 pt-28 sm:pt-36">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6 sm:mb-10">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-chili">
              My Account
            </p>
            <h1 className="mt-2 font-[var(--font-cinzel)] text-3xl sm:text-4xl text-black/90">
              {greetingName ? (
                <>
                  Welcome{greetsWithComma(greetingName)}{" "}
                  <span className="text-chili-deep">{greetingName}</span>
                </>
              ) : (
                <>My Account</>
              )}
            </h1>
            <p className="mt-2 text-sm text-black/55">
              Manage your profile, orders and saved favourites — all in one place.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="space-y-6">
              <section className="relative overflow-hidden rounded-2xl border border-black/8 bg-white shadow-sm">
                <div className="relative h-24 sm:h-28 bg-gradient-to-r from-chili/85 via-chili-light/90 to-chili-deep">
                  <div
                    className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_20%_20%,#fff_0,transparent_40%),radial-gradient(circle_at_80%_60%,#fff_0,transparent_45%)]"
                    aria-hidden
                  />
                </div>

                <div className="px-5 sm:px-7 pb-6 sm:pb-7">
                  <div className="relative z-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-10 sm:-mt-12">
                    <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                      <div
                        aria-hidden
                        className="relative z-20 flex h-20 w-20 sm:h-24 sm:w-24 shrink-0 items-center justify-center rounded-full border-4 border-white bg-ivory font-[var(--font-cinzel)] text-2xl sm:text-3xl text-chili-deep shadow-lg"
                      >
                        {initials}
                      </div>
                      <div className="pb-1">
                        <h2 className="font-[var(--font-cinzel)] text-xl sm:text-2xl text-black/90 leading-tight">
                          {editing
                            ? displayName || <span className="italic text-black/45">No name set</span>
                            : user?.profile.display_name || (
                                <span className="italic text-black/45">No name set</span>
                              )}
                        </h2>
                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-[13px] text-black/55">
                          <span className="inline-flex items-center gap-1.5">
                            <Mail size={13} strokeWidth={1.5} />
                            {user?.email}
                          </span>
                          {(editing ? phone : user?.profile.phone) && (
                            <span className="inline-flex items-center gap-1.5">
                              <Phone size={13} strokeWidth={1.5} />
                              {editing ? phone : user?.profile.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {!editing && (
                      <button
                        type="button"
                        onClick={beginEdit}
                        className="inline-flex items-center gap-1.5 self-start sm:self-end rounded-md border border-chili-deep/20 bg-ivory px-3.5 py-2 text-[11px] font-medium uppercase tracking-[0.15em] text-chili-deep transition-colors hover:bg-chili-deep hover:text-white"
                      >
                        <Edit3 size={13} strokeWidth={1.75} />
                        Edit Profile
                      </button>
                    )}
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-black/8 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-black/6 px-5 sm:px-7 py-4 sm:py-5">
                  <div>
                    <h3 className="font-[var(--font-cinzel)] text-lg sm:text-xl text-black/90">
                      Personal Information
                    </h3>
                    <p className="mt-0.5 text-[11px] sm:text-xs text-black/45 uppercase tracking-[0.14em]">
                      {editing ? "Editing your profile" : "Update your details any time"}
                    </p>
                  </div>
                  {status.kind === "success" && (
                    <span className="hidden sm:inline-flex items-center gap-1.5 rounded-md bg-green-50 px-2.5 py-1 text-[11px] font-medium text-green-700">
                      <Check size={13} strokeWidth={2} />
                      Saved
                    </span>
                  )}
                </div>

                <form
                  onSubmit={handleSave}
                  className="px-5 sm:px-7 py-5 sm:py-6 space-y-4 sm:space-y-5"
                >
                  <FieldRow
                    label="Full Name"
                    icon={<User size={15} strokeWidth={1.5} />}
                    editable={editing}
                    readOnlyValue={
                      user?.profile.display_name ? undefined : "— Add your name"
                    }
                  >
                    <input
                      type="text"
                      value={
                        editing ? displayName : user?.profile.display_name ?? displayName
                      }
                      onChange={(e) => setDisplayName(e.target.value)}
                      disabled={!editing}
                      maxLength={150}
                      placeholder="Enter your full name"
                      readOnly={!editing}
                      className={
                        "w-full rounded-md border bg-transparent px-3.5 py-3 text-[14px] outline-none transition-colors " +
                        (editing
                          ? "border-black/15 focus:border-chili focus:ring-2 focus:ring-chili/10"
                          : "border-transparent text-black/80 cursor-default")
                      }
                    />
                  </FieldRow>

                  <FieldRow
                    label="Email Address"
                    icon={<Mail size={15} strokeWidth={1.5} />}
                    editable={false}
                  >
                    <input
                      type="email"
                      value={user.email}
                      readOnly
                      disabled
                      title="Email cannot be changed here"
                      className="w-full cursor-not-allowed rounded-md border border-transparent bg-ivory px-3.5 py-3 text-[14px] text-black/65 outline-none"
                    />
                    <p className="mt-1.5 pl-0 text-[11px] text-black/40 inline-flex items-center gap-1">
                      <Sparkles
                        size={11}
                        strokeWidth={1.8}
                        className="text-chili/60"
                      />
                      Your email is managed through Supabase and cannot be edited here.
                    </p>
                  </FieldRow>

                  <FieldRow
                    label="Phone Number"
                    icon={<Phone size={15} strokeWidth={1.5} />}
                    editable={editing}
                    optional
                  >
                    <input
                      type="tel"
                      value={editing ? phone : user?.profile.phone ?? phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={!editing}
                      maxLength={30}
                      placeholder="+91 98765 43210 (optional)"
                      readOnly={!editing}
                      className={
                        "w-full rounded-md border bg-transparent px-3.5 py-3 text-[14px] outline-none transition-colors " +
                        (editing
                          ? "border-black/15 focus:border-chili focus:ring-2 focus:ring-chili/10"
                          : "border-transparent text-black/80 cursor-default placeholder:text-black/35")
                      }
                    />
                  </FieldRow>

                  {status.kind === "error" && (
                    <div
                      role="alert"
                      className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3.5 py-3 text-xs sm:text-[13px] text-red-700"
                    >
                      <AlertCircle
                        size={15}
                        strokeWidth={1.75}
                        className="mt-0.5 shrink-0"
                      />
                      <span>{status.message}</span>
                    </div>
                  )}
                  {status.kind === "success" && (
                    <div
                      role="status"
                      className="sm:hidden flex items-start gap-2 rounded-md border border-green-200 bg-green-50 px-3.5 py-3 text-xs text-green-700"
                    >
                      <Check size={15} strokeWidth={2} className="mt-0.5 shrink-0" />
                      <span>{status.message}</span>
                    </div>
                  )}

                  {editing || status.kind === "loading" ? (
                    <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-1">
                      <button
                        type="button"
                        onClick={cancelEdit}
                        disabled={status.kind === "loading"}
                        className="inline-flex items-center justify-center gap-1.5 rounded-md border border-black/15 bg-white px-4 py-2.5 text-[12px] font-medium uppercase tracking-[0.14em] text-black/65 transition-colors hover:text-black/90 disabled:opacity-50"
                      >
                        <X size={13} strokeWidth={2} />
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={status.kind === "loading"}
                        className="inline-flex items-center justify-center gap-1.5 rounded-md bg-chili-deep px-4 py-2.5 text-[12px] font-medium uppercase tracking-[0.16em] text-white shadow-sm transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {status.kind === "loading" ? (
                          <>
                            <Loader2
                              size={13}
                              strokeWidth={2}
                              className="animate-spin"
                            />
                            Saving…
                          </>
                        ) : (
                          <>
                            <Check size={13} strokeWidth={2} />
                            Save Changes
                          </>
                        )}
                      </button>
                    </div>
                  ) : null}
                </form>
              </section>

              <PlaceholderCard
                eyebrow="Orders"
                title="My Orders"
                description="Track your shipments, view invoices and request returns & exchanges."
                icon={<Package size={20} strokeWidth={1.5} />}
                iconBg="from-chili/10 to-chili-light/5"
                iconFg="text-chili"
                accentLine="bg-chili"
              />
              <PlaceholderCard
                eyebrow="Favourites"
                title="Wishlist"
                description="Save pieces you love for later and get notified when they're back in stock."
                icon={<Heart size={20} strokeWidth={1.5} />}
                iconBg="from-rose-50 to-ivory"
                iconFg="text-rose-600"
                accentLine="bg-rose-500"
              />
              <PlaceholderCard
                eyebrow="Checkout"
                title="Saved Addresses"
                description="Store multiple delivery addresses for faster checkout across India."
                icon={<MapPin size={20} strokeWidth={1.5} />}
                iconBg="from-amber-50 to-ivory"
                iconFg="text-amber-700"
                accentLine="bg-amber-500"
              />
            </div>

            <aside className="space-y-6">
              <section className="rounded-2xl border border-black/8 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-black/6 px-5 py-4">
                  <h3 className="font-[var(--font-cinzel)] text-lg text-black/90">
                    Account
                  </h3>
                  <p className="mt-0.5 text-[11px] uppercase tracking-[0.14em] text-black/45">
                    Settings & actions
                  </p>
                </div>

                <ul className="divide-y divide-black/5">
                  <SideLink
                    label="Profile"
                    active
                    icon={<User size={15} strokeWidth={1.5} />}
                    onClick={() => {
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  />
                  <SideLink
                    label="My Orders"
                    comingSoon
                    icon={<Package size={15} strokeWidth={1.5} />}
                  />
                  <SideLink
                    label="Wishlist"
                    comingSoon
                    icon={<Heart size={15} strokeWidth={1.5} />}
                  />
                  <SideLink
                    label="Saved Addresses"
                    comingSoon
                    icon={<MapPin size={15} strokeWidth={1.5} />}
                  />
                </ul>

                <div className="border-t border-black/6 p-4 sm:p-5">
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-chili-deep/15 bg-ivory px-3.5 py-2.5 text-[12px] font-medium uppercase tracking-[0.16em] text-chili-deep transition-colors hover:bg-chili-deep hover:text-white"
                  >
                    <LogOut size={14} strokeWidth={1.75} />
                    Sign Out
                  </button>
                  <p className="mt-3 text-center text-[10px] uppercase tracking-[0.2em] text-black/35">
                    Customer role · {user?.role.replace("_", " ")}
                  </p>
                </div>
              </section>

              <section className="rounded-2xl border border-chili/10 bg-gradient-to-br from-ivory via-white to-ivory p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-chili-deep text-white">
                    <Sparkles size={14} strokeWidth={2} />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-chili">
                      Insider
                    </p>
                    <h4 className="font-[var(--font-cinzel)] text-base text-black/90 leading-tight">
                      Closet Circle
                    </h4>
                  </div>
                </div>
                <p className="mt-3 text-xs sm:text-[13px] text-black/55 leading-relaxed">
                  Early access to new drops, member-exclusive edits and styling notes
                  — delivered to your inbox.
                </p>
                <Link
                  href="/"
                  className="mt-4 inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.14em] text-chili-deep"
                >
                  Explore new arrivals
                  <ChevronRight size={13} strokeWidth={2} />
                </Link>
              </section>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

function greetsWithComma(name: string) {
  return /[^\s\p{L}\p{N}]/u.test(name.charAt(name.length - 1)) ? "" : ",";
}

function FieldRow({
  label,
  icon,
  children,
  editable,
  optional,
  readOnlyValue,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  editable: boolean;
  optional?: boolean;
  readOnlyValue?: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-medium uppercase tracking-[0.14em] text-black/65">
          <span className="text-chili/70">{icon}</span>
          {label}
          {optional && (
            <span className="text-[10px] font-normal uppercase tracking-normal text-black/35">
              · Optional
            </span>
          )}
        </label>
        {!editable && readOnlyValue && (
          <span className="text-[10px] uppercase tracking-[0.15em] text-black/35">
            {readOnlyValue}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function PlaceholderCard({
  eyebrow,
  title,
  description,
  icon,
  iconBg,
  iconFg,
  accentLine,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  iconFg: string;
  accentLine: string;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-black/8 bg-white shadow-sm">
      <div
        className={`absolute left-0 top-0 h-full w-[3px] ${accentLine}`}
        aria-hidden
      />
      <div className="flex items-start gap-4 px-5 sm:px-7 py-5 sm:py-6">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${iconBg} ${iconFg} ring-1 ring-black/5`}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-chili">
            {eyebrow}
          </p>
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            <h3 className="font-[var(--font-cinzel)] text-lg sm:text-xl text-black/90 leading-tight">
              {title}
            </h3>
            <span className="inline-flex items-center gap-1 rounded-full bg-ivory px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-chili/80 ring-1 ring-chili/10">
              <Sparkles size={9} strokeWidth={2} />
              Coming Soon
            </span>
          </div>
          <p className="mt-2 text-xs sm:text-[13px] text-black/55 leading-relaxed">
            {description}
          </p>
          <p className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.15em] text-black/40">
            <ChevronRight size={12} strokeWidth={2} />
            We&apos;re building this for you
          </p>
        </div>
      </div>
    </section>
  );
}

function SideLink({
  label,
  icon,
  active,
  comingSoon,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  comingSoon?: boolean;
  onClick?: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        disabled={comingSoon}
        className={
          "flex w-full items-center justify-between gap-2 px-5 py-3 text-[13px] transition-colors disabled:cursor-default " +
          (active
            ? "bg-ivory text-chili-deep border-l-2 border-chili-deep"
            : comingSoon
              ? "text-black/40"
              : "text-black/70 hover:bg-ivory hover:text-black/90")
        }
      >
        <span className="inline-flex items-center gap-2.5">
          <span className={active ? "text-chili-deep" : "text-black/50"}>{icon}</span>
          <span className="font-medium tracking-[0.02em]">{label}</span>
        </span>
        {comingSoon ? (
          <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-black/35">
            Soon
          </span>
        ) : active ? (
          <Check size={13} strokeWidth={2} className="text-chili-deep" />
        ) : (
          <ChevronRight size={13} strokeWidth={2} className="text-black/35" />
        )}
      </button>
    </li>
  );
}
