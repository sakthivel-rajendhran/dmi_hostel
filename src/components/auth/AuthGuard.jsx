"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth.js";
import { getHomeRoute } from "@/config/roles.js";
import { LoadingScreen } from "@/components/ui/LoadingScreen.jsx";

/**
 * Route protection guard checking authenticated sessions and allowed roles.
 *
 * @param {object} props
 * @param {string[]} [props.allowedRoles]
 * @param {React.ReactNode} props.children
 */
export function AuthGuard({ allowedRoles = [], children }) {
  const router = useRouter();
  const { session, role, loading, logout } = useAuth();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!session || !role) {
      router.replace("/");
      return;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
      const destination = getHomeRoute(role);
      router.replace(destination);
      return;
    }

    // Backend security enforcement: Student accounts must be APPROVED by Warden
    if (role === "student") {
      const accStatus = (session?.user?.accountStatus || session?.user?.account_status || "").toUpperCase();
      if (accStatus && accStatus !== "APPROVED") {
        if (typeof window !== "undefined") {
          localStorage.removeItem("dmi_auth_session_v2");
        }
        router.replace("/");
        return;
      }

      // First-login password change enforcement: Redirect directly to /change-password
      const mustChange = Boolean(session?.mustChangePassword ?? session?.user?.mustChangePassword);
      if (mustChange) {
        router.replace("/change-password");
        return;
      }

      // Re-verify against server in background to prevent stale or manipulated localStorage
      const stuId = session?.user?.studentId || session?.user?.id;
      if (stuId) {
        fetch(`/api/student/profile?studentId=${encodeURIComponent(stuId)}`)
          .then((res) => {
            if (res.status === 403 || res.status === 401) {
              if (typeof window !== "undefined") {
                localStorage.removeItem("dmi_auth_session_v2");
              }
              router.replace("/");
            }
          })
          .catch(() => {});
      }
    }

    setAuthorized(true);
  }, [session, role, loading, allowedRoles, router]);

  if (loading || !authorized) {
    return <LoadingScreen message="Verifying hostel authorization credentials..." />;
  }

  return <>{children}</>;
}

export default AuthGuard;
