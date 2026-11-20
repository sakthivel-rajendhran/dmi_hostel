"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import * as authService from "@/lib/services/authService.js";
import { getHomeRoute } from "@/config/roles.js";

export function useAuth() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = useCallback(() => {
    const current = authService.getCurrentSession();
    setSession(current);
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshSession();

    // Listen for storage changes across tabs or dev panel switches
    const handleStorage = (e) => {
      if (e.key === "dmi_auth_session_v2") {
        refreshSession();
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [refreshSession]);

  const login = useCallback(
    async (role, identifier, password) => {
      const res = await authService.login({ role, identifier, password });
      if (res.ok) {
        setSession(res.data);
        return { success: true, session: res.data };
      }
      return { success: false, message: res.message || "Invalid credentials." };
    },
    []
  );

  const logout = useCallback(async () => {
    await authService.logout();
    setSession(null);
    router.push("/");
  }, [router]);

  const switchRole = useCallback(
    (newRole) => {
      const newSession = authService.switchRoleInstantly(newRole);
      setSession(newSession);
      const home = getHomeRoute(newRole);
      router.push(home);
      return newSession;
    },
    [router]
  );

  return {
    session,
    user: session?.user || null,
    role: session?.role || null,
    loading,
    login,
    logout,
    switchRole,
    refreshSession,
  };
}

export default useAuth;
