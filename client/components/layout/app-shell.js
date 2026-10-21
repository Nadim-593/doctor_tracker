"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Menu, Bell, LogOut } from "lucide-react";
import Sidebar from "@/components/layout/sidebar";
import { apiRequest } from "@/lib/api";

export default function AppShell({ children }) {
  const [open, setOpen] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const pathname = usePathname();
  const router = useRouter();
  const client = useQueryClient();
  const session = useQuery({
    queryKey: ["auth", "me"],
    queryFn: ({ signal }) => apiRequest("/auth/me", { signal }),
    retry: false,
    staleTime: 30_000,
  });
  const logout = useMutation({
    mutationFn: () => apiRequest("/auth/logout", { method: "POST" }),
    onSuccess: () => {
      client.clear();
      router.replace("/login");
    },
    onError: (error) => setLogoutError(error.message),
  });
  useEffect(() => {
    if (session.error?.status === 401) {
      client.clear();
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [session.error, pathname, client, router]);
  useEffect(() => {
    const handleExpired = () => {
      client.clear();
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    };
    window.addEventListener("doctor-tracker:session-expired", handleExpired);
    return () =>
      window.removeEventListener(
        "doctor-tracker:session-expired",
        handleExpired,
      );
  }, [pathname, client, router]);
  if (session.isPending)
    return (
      <div className="page-wrap" role="status">
        Checking your session…
      </div>
    );
  if (session.error?.status === 401)
    return (
      <main className="page-wrap" role="status">
        Your session has ended. Redirecting to sign in…
      </main>
    );
  if (session.error)
    return (
      <main className="page-wrap">
        <section className="form-card" aria-labelledby="session-error-title">
          <h1 id="session-error-title">Unable to verify your session</h1>
          <p className="muted" role="alert">
            {session.error.message ||
              "The session check failed. Check the API connection and try again."}
          </p>
          <div className="form-actions">
            <button
              className="button"
              type="button"
              onClick={() => session.refetch()}
            >
              Retry
            </button>
            <button
              className="button button-primary"
              type="button"
              onClick={() => router.replace("/login")}
            >
              Go to sign in
            </button>
          </div>
        </section>
      </main>
    );
  if (!session.data?.data?.admin?.email)
    return (
      <main className="page-wrap">
        <section className="form-card" aria-labelledby="session-response-title">
          <h1 id="session-response-title">Unable to verify your session</h1>
          <p className="muted" role="alert">
            The API returned an invalid session response.
          </p>
          <div className="form-actions">
            <button
              className="button"
              type="button"
              onClick={() => session.refetch()}
            >
              Retry
            </button>
            <button
              className="button button-primary"
              type="button"
              onClick={() => router.replace("/login")}
            >
              Go to sign in
            </button>
          </div>
        </section>
      </main>
    );
  const email = session.data?.data?.admin?.email || "Administrator";
  return (
    <div className="app-shell">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="main-area">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            aria-label="Open navigation"
            onClick={() => setOpen(true)}
          >
            <Menu size={21} />
          </button>
          <div className="top-title">
            CareTrack <span style={{ color: "#a7b2ba" }}>/</span> Administration
          </div>
          <div className="top-actions">
            <span className="muted" style={{ fontSize: 12 }}>
              {email}
            </span>
            <button
              type="button"
              className="icon-button"
              disabled
              aria-label="Notifications are not configured"
              title="Notifications are not configured"
            >
              <Bell size={18} />
            </button>
            <button
              className="button"
              type="button"
              onClick={() => {
                setLogoutError("");
                logout.mutate();
              }}
              disabled={logout.isPending}
            >
              <LogOut size={15} />
              {logout.isPending ? "Signing out…" : "Log out"}
            </button>
          </div>
        </header>
        {logoutError && (
          <div className="alert" role="alert">
            Could not sign out: {logoutError}
          </div>
        )}
        <main>{children}</main>
      </div>
    </div>
  );
}
