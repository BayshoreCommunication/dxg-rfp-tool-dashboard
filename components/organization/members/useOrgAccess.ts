"use client";

import { useCallback, useEffect, useState } from "react";
import { getOrganizationAccessAction } from "@/app/actions/organizationMembers";
import { orgErrorMessage } from "./errorMessages";
import type { OrgAccess } from "./types";

// The signed-in user's organization role, worked out once per screen; reload() after an
// ownership transfer changes it.
export const useOrgAccess = () => {
  const [access, setAccess] = useState<OrgAccess | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let mounted = true;
    getOrganizationAccessAction().then((result) => {
      if (!mounted) return;
      if (result.success && result.data) {
        setAccess(result.data);
        setError(null);
      } else {
        setError(orgErrorMessage(result, "We couldn't load your organization. Reload the page."));
      }
    });
    return () => {
      mounted = false;
    };
  }, [version]);

  const reload = useCallback(() => setVersion((value) => value + 1), []);
  return { access, error, reload };
};
