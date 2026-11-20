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
  // TODO(BACKEND): replace with server middleware + server-side role checks
  const router = useRouter();
  const { session, role, loading } = useAuth();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!session || !role) {
      // In demo development mode, if user visits a role page directly, auto-fill demo session
      // or redirect to login. If on public routes, allow.
      router.replace("/");
      return;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
      // Unauthorized for this specific role, redirect to user's assigned home route
      const destination = getHomeRoute(role);
      router.replace(destination);
      return;
    }

    setAuthorized(true);
  }, [session, role, loading, allowedRoles, router]);

  if (loading || !authorized) {
    return <LoadingScreen message="Verifying hostel authorization credentials..." />;
  }

  return <>{children}</>;
}

export default AuthGuard;
