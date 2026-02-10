import { useState, useEffect, useCallback, useMemo } from "react";
import type { WalletType, WalletGroup } from "../types";
import { DEFAULT_GROUP_ID } from "../types";
import { saveWalletGroups, loadWalletGroups } from "../storage";

interface UseWalletGroupsReturn {
  groups: WalletGroup[];
  createGroup: (name: string, color?: string) => string;
  renameGroup: (groupId: string, newName: string) => void;
  deleteGroup: (groupId: string) => void;
  reorderGroups: (newOrder: WalletGroup[]) => void;
  updateGroupColor: (groupId: string, color: string) => void;
  moveWalletToGroup: (walletId: number, targetGroupId: string) => void;
  moveWalletsToGroup: (walletIds: number[], targetGroupId: string) => void;
  getWalletsForGroup: (groupId: string) => WalletType[];
}

export function useWalletGroups(
  wallets: WalletType[],
  setWallets: (
    wallets: WalletType[] | ((prev: WalletType[]) => WalletType[]),
  ) => void,
): UseWalletGroupsReturn {
  const [groups, setGroups] = useState<WalletGroup[]>(() => loadWalletGroups());

  // Persist groups on change
  useEffect(() => {
    saveWalletGroups(groups);
  }, [groups]);

  // Migrate wallets without groupId whenever wallets change
  // (runs when wallets are first loaded from AppContext, not just on mount)
  useEffect(() => {
    if (wallets.length > 0 && wallets.some((w) => !w.groupId)) {
      setWallets((prev) =>
        prev.map((w) => ({
          ...w,
          groupId: w.groupId || DEFAULT_GROUP_ID,
        })),
      );
    }
  }, [wallets, setWallets]);

  const createGroup = useCallback(
    (name: string, color?: string) => {
      const id = `group_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const maxOrder = groups.reduce((max, g) => Math.max(max, g.order), 0);
      const newGroup: WalletGroup = {
        id,
        name,
        order: maxOrder + 1,
        color,
      };
      setGroups((prev) => [...prev, newGroup]);
      return id;
    },
    [groups],
  );

  const renameGroup = useCallback((groupId: string, newName: string) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, name: newName } : g)),
    );
  }, []);

  // Use functional update to avoid stale closure over wallets
  const deleteGroup = useCallback(
    (groupId: string) => {
      const group = groups.find((g) => g.id === groupId);
      if (!group || group.isDefault) return;

      // Move wallets in this group to default (functional update avoids stale data)
      setWallets((prev) =>
        prev.map((w) =>
          w.groupId === groupId ? { ...w, groupId: DEFAULT_GROUP_ID } : w,
        ),
      );

      setGroups((prev) => prev.filter((g) => g.id !== groupId));
    },
    [groups, setWallets],
  );

  const reorderGroups = useCallback((newOrder: WalletGroup[]) => {
    setGroups(newOrder.map((g, i) => ({ ...g, order: i })));
  }, []);

  const updateGroupColor = useCallback(
    (groupId: string, color: string) => {
      setGroups((prev) =>
        prev.map((g) => (g.id === groupId ? { ...g, color } : g)),
      );
    },
    [],
  );

  // Functional update ensures correct state even when called in a loop
  const moveWalletToGroup = useCallback(
    (walletId: number, targetGroupId: string) => {
      setWallets((prev) =>
        prev.map((w) =>
          w.id === walletId ? { ...w, groupId: targetGroupId } : w,
        ),
      );
    },
    [setWallets],
  );

  // Functional update ensures all wallets are moved atomically
  const moveWalletsToGroup = useCallback(
    (walletIds: number[], targetGroupId: string) => {
      const idSet = new Set(walletIds);
      setWallets((prev) =>
        prev.map((w) =>
          idSet.has(w.id) ? { ...w, groupId: targetGroupId } : w,
        ),
      );
    },
    [setWallets],
  );

  const getWalletsForGroup = useCallback(
    (groupId: string) =>
      wallets.filter(
        (w) => (w.groupId || DEFAULT_GROUP_ID) === groupId,
      ),
    [wallets],
  );

  const sortedGroups = useMemo(
    () => [...groups].sort((a, b) => a.order - b.order),
    [groups],
  );

  return {
    groups: sortedGroups,
    createGroup,
    renameGroup,
    deleteGroup,
    reorderGroups,
    updateGroupColor,
    moveWalletToGroup,
    moveWalletsToGroup,
    getWalletsForGroup,
  };
}
