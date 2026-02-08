import { useState, useEffect, useCallback, useMemo } from "react";
import type { WalletType, WalletGroup } from "../types";
import { DEFAULT_GROUP_ID } from "../types";
import { saveWalletGroups, loadWalletGroups } from "../storage";
import { saveWalletsToCookies } from "../storage";

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
  setWallets: (wallets: WalletType[]) => void,
): UseWalletGroupsReturn {
  const [groups, setGroups] = useState<WalletGroup[]>(() => loadWalletGroups());

  // Persist groups on change
  useEffect(() => {
    saveWalletGroups(groups);
  }, [groups]);

  // Migrate wallets without groupId on mount
  useEffect(() => {
    const needsMigration = wallets.some((w) => !w.groupId);
    if (needsMigration && wallets.length > 0) {
      const migrated = wallets.map((w) => ({
        ...w,
        groupId: w.groupId || DEFAULT_GROUP_ID,
      }));
      setWallets(migrated);
      saveWalletsToCookies(migrated);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const deleteGroup = useCallback(
    (groupId: string) => {
      const group = groups.find((g) => g.id === groupId);
      if (!group || group.isDefault) return;

      // Move wallets in this group to default
      const updated = wallets.map((w) =>
        w.groupId === groupId ? { ...w, groupId: DEFAULT_GROUP_ID } : w,
      );
      setWallets(updated);
      saveWalletsToCookies(updated);

      setGroups((prev) => prev.filter((g) => g.id !== groupId));
    },
    [groups, wallets, setWallets],
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

  const moveWalletToGroup = useCallback(
    (walletId: number, targetGroupId: string) => {
      const updated = wallets.map((w) =>
        w.id === walletId ? { ...w, groupId: targetGroupId } : w,
      );
      setWallets(updated);
      saveWalletsToCookies(updated);
    },
    [wallets, setWallets],
  );

  const moveWalletsToGroup = useCallback(
    (walletIds: number[], targetGroupId: string) => {
      const idSet = new Set(walletIds);
      const updated = wallets.map((w) =>
        idSet.has(w.id) ? { ...w, groupId: targetGroupId } : w,
      );
      setWallets(updated);
      saveWalletsToCookies(updated);
    },
    [wallets, setWallets],
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
