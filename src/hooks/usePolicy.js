"use client";

import { useState, useEffect, useCallback } from "react";
import { getPolicy, updatePolicy as serviceUpdatePolicy } from "@/lib/services/settingsService.js";

/**
 * Hook to consume and mutate switchable operational policies
 * (Room Allocation Mode and Photo Upload Policy)
 */
export function usePolicy() {
  const [policy, setPolicy] = useState(getPolicy);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Initial sync
    setPolicy(getPolicy());

    // Listen to custom intra-tab events
    const handlePolicyChange = (e) => {
      if (e.detail) {
        setPolicy(e.detail);
      } else {
        setPolicy(getPolicy());
      }
    };

    // Listen to cross-tab storage changes
    const handleStorageChange = (e) => {
      if (e.key === "dmi_system_policy_v2") {
        setPolicy(getPolicy());
      }
    };

    window.addEventListener("dmi-policy-change", handlePolicyChange);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("dmi-policy-change", handlePolicyChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const updatePolicy = useCallback((partial) => {
    setIsLoading(true);
    const updated = serviceUpdatePolicy(partial);
    setPolicy(updated);
    setIsLoading(false);
    return updated;
  }, []);

  return {
    policy,
    updatePolicy,
    isLoading,
  };
}

export default usePolicy;
