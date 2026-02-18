/* eslint-disable react-refresh/only-export-components */
/**
 * Limit Orders — client-side price monitoring with localStorage persistence.
 * Orders trigger when iframe price data crosses the user-defined threshold.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { LIMIT_ORDERS } from "./constants";
import type { LimitOrder, LimitOrderStatus, LimitPriceMode, WalletType, IframeData } from "./types";
import type { InputMode } from "./trading";

// ============================================================================
// localStorage CRUD
// ============================================================================

const dispatch = (): void => {
  window.dispatchEvent(new Event("limitOrdersUpdated"));
};

export const getLimitOrders = (): LimitOrder[] => {
  try {
    const stored = localStorage.getItem(LIMIT_ORDERS.STORAGE_KEY);
    if (!stored) return [];
    return (JSON.parse(stored) as LimitOrder[]).sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
};

const saveLimitOrders = (orders: LimitOrder[]): void => {
  localStorage.setItem(LIMIT_ORDERS.STORAGE_KEY, JSON.stringify(orders));
  dispatch();
};

export const addLimitOrder = (
  entry: Omit<LimitOrder, "id" | "createdAt" | "status">,
): LimitOrder => {
  const orders = getLimitOrders();
  const active = orders.filter((o) => o.status === "active");
  if (active.length >= LIMIT_ORDERS.MAX_ACTIVE_ORDERS) {
    throw new Error(`Maximum ${LIMIT_ORDERS.MAX_ACTIVE_ORDERS} active limit orders`);
  }

  const newOrder: LimitOrder = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
    createdAt: Date.now(),
    status: "active",
  };

  saveLimitOrders([newOrder, ...orders]);
  return newOrder;
};

export const cancelLimitOrder = (id: string): void => {
  const orders = getLimitOrders();
  saveLimitOrders(orders.filter((o) => o.id !== id));
};

export const updateLimitOrderStatus = (
  id: string,
  status: LimitOrderStatus,
  error?: string,
): void => {
  const orders = getLimitOrders();
  saveLimitOrders(
    orders.map((o) =>
      o.id === id ? { ...o, status, resolvedAt: Date.now(), error } : o,
    ),
  );
};

export const getActiveOrdersForToken = (tokenAddress: string): LimitOrder[] =>
  getLimitOrders().filter(
    (o) => o.status === "active" && o.tokenAddress === tokenAddress,
  );

// ============================================================================
// Price check logic
// ============================================================================

export const checkLimitOrders = (
  orders: LimitOrder[],
  currentMarketCap: number | null,
  tokenPriceSOL: number | null,
): LimitOrder[] => {
  if (!orders.length) return [];

  return orders.filter((order) => {
    if (order.status !== "active") return false;

    const currentValue =
      order.priceMode === "marketCap" ? currentMarketCap : tokenPriceSOL;
    if (currentValue === null || currentValue <= 0) return false;

    if (order.side === "buy") {
      // Buy: trigger when price drops to/below target
      return currentValue <= order.targetPrice;
    } else {
      // Sell: trigger when price rises to/above target
      return currentValue >= order.targetPrice;
    }
  });
};

// ============================================================================
// Monitor hook
// ============================================================================

export function useLimitOrderMonitor(
  iframeData: IframeData | null,
  currentMarketCap: number | null,
  wallets: WalletType[],
  tokenAddress: string,
  handleTradeSubmit: (
    wallets: WalletType[],
    isBuy: boolean,
    dex?: string,
    buyAmount?: string,
    sellAmount?: string,
    tokenAddressParam?: string,
    sellInputMode?: InputMode,
  ) => void,
  showToast: (message: string, type: "success" | "error") => void,
): { activeOrders: LimitOrder[] } {
  const [activeOrders, setActiveOrders] = useState<LimitOrder[]>([]);
  const inFlightRef = useRef<Set<string>>(new Set());
  const lastCheckRef = useRef(0);

  // Load active orders and listen for changes
  const loadOrders = useCallback(() => {
    if (!tokenAddress) {
      setActiveOrders([]);
      return;
    }
    setActiveOrders(getActiveOrdersForToken(tokenAddress));
  }, [tokenAddress]);

  useEffect(() => {
    loadOrders();
    window.addEventListener("limitOrdersUpdated", loadOrders);
    return () => window.removeEventListener("limitOrdersUpdated", loadOrders);
  }, [loadOrders]);

  // Check orders on price changes
  useEffect(() => {
    if (!iframeData || !tokenAddress || activeOrders.length === 0) return;

    const now = Date.now();
    if (now - lastCheckRef.current < LIMIT_ORDERS.CHECK_DEBOUNCE_MS) return;
    lastCheckRef.current = now;

    const tokenPriceSOL = iframeData.tokenPrice?.tokenPrice ?? null;
    const triggered = checkLimitOrders(activeOrders, currentMarketCap, tokenPriceSOL);

    for (const order of triggered) {
      if (inFlightRef.current.has(order.id)) continue;
      inFlightRef.current.add(order.id);

      // Mark triggered immediately to prevent double-fire
      updateLimitOrderStatus(order.id, "triggered");

      // Find matching wallets (use current active wallets as fallback)
      const orderWallets = wallets.filter(
        (w) => !w.isArchived && order.walletAddresses.includes(w.address),
      );
      const tradingWallets = orderWallets.length > 0 ? orderWallets : wallets.filter((w) => w.isActive && !w.isArchived);

      if (tradingWallets.length === 0) {
        updateLimitOrderStatus(order.id, "failed", "No active wallets");
        showToast("Limit order failed: no active wallets", "error");
        inFlightRef.current.delete(order.id);
        continue;
      }

      const priceLabel = order.priceMode === "marketCap"
        ? `$${formatCompact(order.targetPrice)}`
        : `${order.targetPrice} SOL`;

      showToast(
        `Limit ${order.side} triggered @ ${priceLabel}`,
        "success",
      );

      // Execute the trade
      if (order.side === "buy") {
        handleTradeSubmit(
          tradingWallets,
          true,
          undefined,
          String(order.amount),
          undefined,
          order.tokenAddress,
        );
      } else {
        handleTradeSubmit(
          tradingWallets,
          false,
          undefined,
          undefined,
          String(order.amount),
          order.tokenAddress,
        );
      }

      inFlightRef.current.delete(order.id);
    }
  }, [iframeData, currentMarketCap, activeOrders, wallets, tokenAddress, handleTradeSubmit, showToast]);

  return { activeOrders };
}

// ============================================================================
// Formatting helpers
// ============================================================================

export const formatCompact = (value: number): string => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  if (value < 0.001) return value.toExponential(2);
  return value.toFixed(3);
};

export const formatLimitPrice = (
  order: LimitOrder,
): string => {
  if (order.priceMode === "marketCap") {
    return `$${formatCompact(order.targetPrice)}`;
  }
  return `${formatCompact(order.targetPrice)} SOL`;
};

export const formatDistance = (
  order: LimitOrder,
  currentMarketCap: number | null,
  tokenPriceSOL: number | null,
): string => {
  const currentValue =
    order.priceMode === "marketCap" ? currentMarketCap : tokenPriceSOL;
  if (!currentValue || currentValue <= 0) return "";

  const pctDiff = ((currentValue - order.targetPrice) / currentValue) * 100;
  const sign = pctDiff > 0 ? "+" : "";
  return `${sign}${pctDiff.toFixed(1)}%`;
};

export type { LimitPriceMode };
