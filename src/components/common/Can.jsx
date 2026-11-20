"use client";

import React from "react";
import { usePermissions } from "@/hooks/usePermissions.js";

/**
 * Declarative conditional rendering component based on permissions
 *
 * @example
 * <Can permission="pass.approve" fallback={<p>No permission</p>}>
 *   <button>Approve</button>
 * </Can>
 */
export function Can({ permission, permissions, any = false, fallback = null, children }) {
  const { can, canAny, canAll } = usePermissions();

  let isAllowed = false;

  if (permission) {
    isAllowed = can(permission);
  } else if (Array.isArray(permissions)) {
    isAllowed = any ? canAny(permissions) : canAll(permissions);
  }

  if (!isAllowed) {
    return fallback;
  }

  return <>{children}</>;
}

export default Can;
