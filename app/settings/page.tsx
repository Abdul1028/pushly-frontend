"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { API_BASE_URL } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import {
  User,
  Mail,
  LogOut,
  Shield,
  Bell,
  Loader2,
  Check,
  AlertTriangle,
} from "lucide-react";
import { PRODUCT_NAME } from "@/lib/config";
import { GitHubConnectionCard } from "@/components/github-connection-card";
import { PageHeader, Panel, TextField, btn } from "@/components/project/ui";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";

type TabKey = "profile" | "account" | "notifications";

export default function SettingsPage() {
  const router = useRouter();
  const { user, token, status, logout } = useAuth();
  const { toast } = useToast();
  const reduce = usePrefersReducedMotion();

  const [activeTab, setActiveTab] = useState<TabKey>("profile");
  const [loggingOut, setLoggingOut] = useState(false);

  // Profile edit states
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [savingProfile, setSavingProfile] = useState(false);

  // Sync state if user loads late
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
    }
  }, [user]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      if (token) {
        try {
          await fetch(`${API_BASE_URL}/api/auth/logout`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });
        } catch (error) {
          console.error("Backend logout failed:", error);
        }
      }

      await logout();

      toast({
        title: "Signed out",
        description: "You have been signed out of your account.",
      });

      router.push("/");
      router.refresh();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "An error occurred while signing out.";
      toast({
        variant: "destructive",
        title: "Sign out failed",
        description: msg,
      });
    } finally {
      setLoggingOut(false);
    }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));

      toast({
        title: "Profile updated",
        description: "Your personal details have been saved.",
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to update profile.";
      toast({
        variant: "destructive",
        title: "Update failed",
        description: msg,
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const getInitials = () => {
    const first = user?.firstName || user?.email?.[0] || "";
    const last = user?.lastName || "";
    return `${first[0] || ""}${last[0] || ""}`.toUpperCase();
  };

  if (status === "loading") {
    return (
      <div className="appearance-light bg-fill text-label min-h-[calc(100svh-3rem)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-6 animate-spin text-label-3" />
          <p className="text-[13px] text-label-2">Loading settings…</p>
        </div>
      </div>
    );
  }

  if (status !== "authenticated") {
    return <div className="appearance-light bg-fill min-h-[calc(100svh-3rem)]" />;
  }

  return (
    <div className="appearance-light bg-fill text-label min-h-[calc(100svh-3rem)]">
      <div className="mx-auto max-w-[760px] px-4 sm:px-6 py-8 lg:py-12">
        <PageHeader
          title="Settings"
          subtitle="Manage your profile, authentication, and connected services."
        />

        {/* ── User Profile Identity Hero ── */}
        <section className="mt-8 rounded-2xl bg-white border border-black/[0.06] p-6 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            {/* Avatar Squircle */}
            <div className="relative shrink-0">
              <div className="size-16 rounded-2xl bg-label text-white flex items-center justify-center text-[22px] font-semibold tracking-tight shadow-[0_4px_12px_rgba(0,0,0,0.12)]">
                {getInitials()}
              </div>
              <span className="absolute -bottom-1 -right-1 size-5 rounded-full bg-sys-green border-2 border-white flex items-center justify-center shadow-sm">
                <Check className="size-3 text-white stroke-[3]" />
              </span>
            </div>

            {/* User Meta */}
            <div className="flex-1 text-center sm:text-left min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                <h2 className="text-[20px] font-semibold tracking-[-0.025em] text-label truncate">
                  {user?.firstName && user?.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user?.email}
                </h2>
                {user?.role && (
                  <span className="inline-flex items-center h-5 px-2 rounded-md bg-fill-2 text-[11px] font-medium text-label-2 capitalize">
                    {user.role.toLowerCase()}
                  </span>
                )}
              </div>

              <div className="mt-1.5 flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-[13px] text-label-2">
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="size-3.5 text-label-3" aria-hidden />
                  {user?.email}
                </span>
                {user?.id && (
                  <span className="inline-flex items-center gap-1 text-label-3 font-mono text-[12px]">
                    ID: {user.id}
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── Tab Selector (Apple-style Segmented) ── */}
        <div className="mt-6 flex justify-center sm:justify-start">
          <div className="inline-flex p-0.5 rounded-full bg-fill-2">
            <button
              type="button"
              onClick={() => setActiveTab("profile")}
              className={cn(
                "inline-flex items-center gap-2 h-9 px-4 rounded-full text-[14px] font-medium transition-all duration-150",
                activeTab === "profile"
                  ? "bg-white text-label shadow-[0_1px_3px_rgba(0,0,0,0.12)]"
                  : "text-label-2 hover:text-label"
              )}
            >
              <User className="size-4" aria-hidden />
              Profile
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("account")}
              className={cn(
                "inline-flex items-center gap-2 h-9 px-4 rounded-full text-[14px] font-medium transition-all duration-150",
                activeTab === "account"
                  ? "bg-white text-label shadow-[0_1px_3px_rgba(0,0,0,0.12)]"
                  : "text-label-2 hover:text-label"
              )}
            >
              <Shield className="size-4" aria-hidden />
              Account
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("notifications")}
              className={cn(
                "inline-flex items-center gap-2 h-9 px-4 rounded-full text-[14px] font-medium transition-all duration-150",
                activeTab === "notifications"
                  ? "bg-white text-label shadow-[0_1px_3px_rgba(0,0,0,0.12)]"
                  : "text-label-2 hover:text-label"
              )}
            >
              <Bell className="size-4" aria-hidden />
              Notifications
            </button>
          </div>
        </div>

        {/* ── Tab Content ── */}
        <div className="mt-6">
          <AnimatePresence mode="wait" initial={false}>
            {activeTab === "profile" && (
              <motion.div
                key="tab-profile"
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                className="space-y-6"
              >
                <Panel
                  title="Personal Information"
                  description={`How your identity is displayed across ${PRODUCT_NAME}.`}
                >
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <TextField
                        label="First name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="John"
                        disabled={savingProfile}
                      />
                      <TextField
                        label="Last name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Appleseed"
                        disabled={savingProfile}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <TextField
                        label="Email address"
                        type="email"
                        value={user?.email || ""}
                        disabled
                        hint="Your email address is your login identity and cannot be changed."
                      />
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-3 border-t border-black/[0.06]">
                      <button
                        type="button"
                        onClick={() => {
                          setFirstName(user?.firstName || "");
                          setLastName(user?.lastName || "");
                        }}
                        disabled={savingProfile}
                        className={btn.secondary}
                      >
                        Reset
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveProfile}
                        disabled={savingProfile}
                        className={btn.primary}
                      >
                        {savingProfile ? (
                          <>
                            <Loader2 className="size-4 animate-spin" aria-hidden />
                            Saving…
                          </>
                        ) : (
                          "Save changes"
                        )}
                      </button>
                    </div>
                  </div>
                </Panel>
              </motion.div>
            )}

            {activeTab === "account" && (
              <motion.div
                key="tab-account"
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                className="space-y-6"
              >
                {/* Active Session */}
                <Panel
                  title="Session"
                  description="Details about your current authenticated session."
                >
                  <div className="space-y-5">
                    <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-fill border border-black/[0.06]">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="relative flex size-2.5">
                          <span className="absolute inset-0 rounded-full bg-sys-green animate-ping opacity-60" />
                          <span className="relative size-2.5 rounded-full bg-sys-green" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[14px] font-medium text-label truncate">Current browser session</p>
                          <p className="text-[12px] text-label-2 truncate mt-0.5">
                            Authenticated as <span className="font-medium text-label">{user?.email}</span>
                          </p>
                        </div>
                      </div>
                      <span className="inline-flex items-center h-5 px-2 rounded-md bg-sys-green/10 text-[11px] font-medium text-sys-green shrink-0">
                        Active
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div className="min-w-0 pr-4">
                        <p className="text-[14px] font-medium text-label">Sign out of {PRODUCT_NAME}</p>
                        <p className="text-[12px] text-label-2 mt-0.5">
                          Terminate this active session on your current device.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleLogout}
                        disabled={loggingOut}
                        className={btn.secondary}
                      >
                        {loggingOut ? (
                          <>
                            <Loader2 className="size-4 animate-spin" aria-hidden />
                            Signing out…
                          </>
                        ) : (
                          <>
                            <LogOut className="size-4" aria-hidden />
                            Sign out
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </Panel>

                {/* GitHub Integration */}
                <Panel
                  title="GitHub Integration"
                  description="Connect your GitHub account to import repositories and enable automated preview builds."
                >
                  <GitHubConnectionCard token={token} />
                </Panel>

                {/* Destructive Zone (Clean Apple-Style) */}
                <Panel
                  title={<span className="text-sys-red">Delete Account</span>}
                  description="Permanently delete your account and all associated deployment projects."
                >
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-fill border border-black/[0.06]">
                      <AlertTriangle className="size-4 text-sys-orange shrink-0 mt-0.5" aria-hidden />
                      <div className="text-[13px] text-label-2 leading-relaxed">
                        Deleting your account will immediately stop all active deployments, release your custom subdomains, and wipe your build artifacts. This operation is permanent and irreversible.
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 pt-1">
                      <p className="text-[12px] text-label-3">
                        Self-serve account deletion is temporarily restricted.
                      </p>
                      <button
                        type="button"
                        disabled
                        className={btn.dangerQuiet}
                      >
                        Delete account
                      </button>
                    </div>
                  </div>
                </Panel>
              </motion.div>
            )}

            {activeTab === "notifications" && (
              <motion.div
                key="tab-notifications"
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                className="space-y-6"
              >
                <Panel
                  title="Notification Preferences"
                  description="Configure deployment alerts, commit webhooks, and status messages."
                >
                  <div className="py-12 text-center space-y-3">
                    <div className="size-12 rounded-full bg-fill-2 text-label-3 mx-auto grid place-items-center">
                      <Bell className="size-5" />
                    </div>
                    <p className="text-[15px] font-medium text-label">Notifications are in preview</p>
                    <p className="text-[13px] text-label-2 max-w-sm mx-auto">
                      Granular email and webhook alerts for failed and successful builds will be available soon.
                    </p>
                  </div>
                </Panel>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
