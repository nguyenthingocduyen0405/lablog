"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { isPlatformAdmin as checkPlatformAdmin } from "./admin";
import { createClient } from "./supabase/client";
import type { LabRole } from "./lab-tenancy";

const ROLE_PREVIEW_KEY = "lablog-role-preview";

export type RolePreviewMode = "lab-admin" | "member";

type RolePreviewValue = {
  isPlatformAdmin: boolean;
  previewRole: RolePreviewMode | null;
  setPreviewRole: (role: RolePreviewMode | null) => void;
  previewLabRole: (actualRole: LabRole) => LabRole;
};

const RolePreviewContext = createContext<RolePreviewValue | null>(null);

export function resolvePreviewLabRole(
  actualRole: LabRole,
  previewRole: RolePreviewMode | null,
  isPlatformAdmin: boolean,
): LabRole {
  if (!isPlatformAdmin || !previewRole) return actualRole;
  return previewRole === "lab-admin" ? "admin" : "member";
}

export function RolePreviewProvider({ children }: { children: ReactNode }) {
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [previewRole, setPreviewRoleState] = useState<RolePreviewMode | null>(
    null,
  );

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let refreshTimer: number | null = null;

    const verifyAccess = async () => {
      const allowed = await checkPlatformAdmin();
      if (cancelled) return;
      setIsPlatformAdmin(allowed);
      if (!allowed) {
        window.sessionStorage.removeItem(ROLE_PREVIEW_KEY);
        setPreviewRoleState(null);
        return;
      }
      const stored = window.sessionStorage.getItem(ROLE_PREVIEW_KEY);
      setPreviewRoleState(
        stored === "lab-admin" || stored === "member" ? stored : null,
      );
    };

    const scheduleVerification = () => {
      if (refreshTimer !== null) window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        refreshTimer = null;
        void verifyAccess();
      }, 0);
    };

    void verifyAccess();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(scheduleVerification);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      if (refreshTimer !== null) window.clearTimeout(refreshTimer);
    };
  }, []);

  const setPreviewRole = useCallback(
    (role: RolePreviewMode | null) => {
      if (!isPlatformAdmin) return;
      if (role) window.sessionStorage.setItem(ROLE_PREVIEW_KEY, role);
      else window.sessionStorage.removeItem(ROLE_PREVIEW_KEY);
      setPreviewRoleState(role);
    },
    [isPlatformAdmin],
  );

  const value = useMemo<RolePreviewValue>(
    () => ({
      isPlatformAdmin,
      previewRole,
      setPreviewRole,
      previewLabRole: (actualRole) =>
        resolvePreviewLabRole(actualRole, previewRole, isPlatformAdmin),
    }),
    [isPlatformAdmin, previewRole, setPreviewRole],
  );

  return (
    <RolePreviewContext.Provider value={value}>
      {children}
    </RolePreviewContext.Provider>
  );
}

export function useRolePreview() {
  const value = useContext(RolePreviewContext);
  if (!value) {
    throw new Error("useRolePreview must be used inside RolePreviewProvider");
  }
  return value;
}
