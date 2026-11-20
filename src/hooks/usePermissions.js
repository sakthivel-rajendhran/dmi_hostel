"use client";

import { useAuth } from "./use-auth.js";
import { can, canAny, canAll } from "@/config/permissions.js";

/**
 * Hook to inspect current user permissions
 */
export function usePermissions() {
  const { user, role } = useAuth();

  return {
    role,
    can: (permission) => can(user || role, permission),
    canAny: (permissions) => canAny(user || role, permissions),
    canAll: (permissions) => canAll(user || role, permissions),
  };
}

export default usePermissions;
