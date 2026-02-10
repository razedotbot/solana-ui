import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "active_wallet_group";
const EVENT_NAME = "wallet-group-changed";

/**
 * Shared hook for the active wallet group.
 * All components using this hook stay in sync via a custom DOM event.
 */
export function useActiveWalletGroup(): [string, (groupId: string) => void] {
  const [activeGroupId, setActiveGroupId] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) || "all";
  });

  const setGroup = useCallback((groupId: string) => {
    setActiveGroupId(groupId);
    localStorage.setItem(STORAGE_KEY, groupId);
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: groupId }));
  }, []);

  // Sync when another component on the same page changes the group
  useEffect(() => {
    const handler = (e: Event): void => {
      const groupId = (e as CustomEvent<string>).detail;
      setActiveGroupId(groupId);
    };
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  }, []);

  return [activeGroupId, setGroup];
}
