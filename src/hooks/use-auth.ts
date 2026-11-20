"use client";

// @ts-ignore
import { useAuth as useAuthJs } from "./use-auth.js";

export function useAuth(): any {
  return useAuthJs();
}

export default useAuth;
