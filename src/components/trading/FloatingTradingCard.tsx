import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, Move, Edit3, Check } from "lucide-react";
import { toggleWallet } from "../../utils/wallet";
import { saveWalletsToCookies } from "../../utils/storage";
import WalletSelectorPopup from "../trading/WalletSelectorPopup";
import PresetButton from "../shared/PresetButton";
import TabButton from "../shared/TabButton";
import { loadPresetsFromCookies, savePresetsToCookies } from "../shared/presetTabsUtils";
import type { WalletType, PresetTab } from "../../utils/types";

// Hook to detect mobile viewport
const useIsMobile = (): boolean => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = (): void => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return isMobile;
};

interface FloatingTradingCardProps {
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number };
  onPositionChange: (position: { x: number; y: number }) => void;
  isDragging: boolean;
  onDraggingChange: (dragging: boolean) => void;
  tokenAddress: string;
  wallets: WalletType[];
  setWallets: (wallets: WalletType[]) => void;
  selectedDex: string;
  setBuyAmount: (amount: string) => void;
  setSellAmount: (amount: string) => void;
  handleTradeSubmit: (
    wallets: WalletType[],
    isBuy: boolean,
    dex?: string,
    buyAmount?: string,
    sellAmount?: string,
  ) => void;
  isLoading: boolean;
  countActiveWallets: (wallets: WalletType[]) => number;
  baseCurrencyBalances: Map<string, number>;
  tokenBalances: Map<string, number>;
  embedded?: boolean;
  containerRef?: React.RefObject<HTMLDivElement>;
}

const FloatingTradingCard: React.FC<FloatingTradingCardProps> = ({
  isOpen,
  onClose,
  position,
  onPositionChange,
  isDragging,
  onDraggingChange,
  tokenAddress,
  wallets,
  setWallets,
  selectedDex,
  setBuyAmount,
  setSellAmount,
  handleTradeSubmit,
  isLoading,
  countActiveWallets,
  baseCurrencyBalances,
  tokenBalances,
  embedded = false,
  containerRef,
}) => {
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isEditMode, setIsEditMode] = useState(false);
  const [showWalletSelector, setShowWalletSelector] = useState(false);
  const isMobile = useIsMobile();

  const cardRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);
  const walletButtonRef = useRef<HTMLButtonElement>(null);

  // Wallet selection handlers
  const handleToggleWallet = (walletId: number): void => {
    const updatedWallets = toggleWallet(wallets, walletId);
    setWallets(updatedWallets);
    saveWalletsToCookies(updatedWallets);
  };

  const handleSelectAll = (): void => {
    const allActive = wallets
      .filter((w) => !w.isArchived)
      .every((w) => w.isActive);
    const updatedWallets = wallets.map((wallet) => ({
      ...wallet,
      isActive: wallet.isArchived ? wallet.isActive : !allActive,
    }));
    setWallets(updatedWallets);
    saveWalletsToCookies(updatedWallets);
  };

  const handleSelectAllWithBalance = (): void => {
    const walletsWithBalance = wallets.filter((wallet) => {
      if (wallet.isArchived) return false;
      const solBal = baseCurrencyBalances.get(wallet.address) || 0;
      const tokenBal = tokenBalances.get(wallet.address) || 0;
      return solBal > 0 || tokenBal > 0;
    });

    if (walletsWithBalance.length === 0) {
      return;
    }

    const allWithBalanceActive = walletsWithBalance.every((w) => w.isActive);
    const updatedWallets = wallets.map((wallet) => {
      if (wallet.isArchived) return wallet;
      const solBal = baseCurrencyBalances.get(wallet.address) || 0;
      const tokenBal = tokenBalances.get(wallet.address) || 0;
      const hasBalance = solBal > 0 || tokenBal > 0;

      if (allWithBalanceActive) {
        return { ...wallet, isActive: false };
      } else {
        return { ...wallet, isActive: hasBalance ? true : wallet.isActive };
      }
    });

    setWallets(updatedWallets);
    saveWalletsToCookies(updatedWallets);
  };

  // Initialize presets from cookies
  const initialPresets = loadPresetsFromCookies();
  const [presetTabs, setPresetTabs] = useState<PresetTab[]>(
    initialPresets.tabs,
  );
  const [activeTabId, setActiveTabId] = useState<string>(
    initialPresets.activeTabId,
  );
  const activeTab =
    presetTabs.find((tab: PresetTab) => tab.id === activeTabId) ||
    presetTabs[0];

  // Save presets to cookies whenever they change
  useEffect(() => {
    savePresetsToCookies(presetTabs, activeTabId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetTabs, activeTabId]);

  // Handle tab switching with cookie save
  const handleTabSwitch = (tabId: string): void => {
    setActiveTabId(tabId);
  };

  // Edit preset handlers
  const handleEditBuyPreset = (index: number, newValue: string): void => {
    setPresetTabs((tabs: PresetTab[]) =>
      tabs.map((tab: PresetTab) =>
        tab.id === activeTabId
          ? {
              ...tab,
              buyPresets: tab.buyPresets.map((preset: string, i: number) =>
                i === index ? newValue : preset,
              ),
            }
          : tab,
      ),
    );
  };

  const handleEditSellPreset = (index: number, newValue: string): void => {
    setPresetTabs((tabs: PresetTab[]) =>
      tabs.map((tab: PresetTab) =>
        tab.id === activeTabId
          ? {
              ...tab,
              sellPresets: tab.sellPresets.map((preset: string, i: number) =>
                i === index ? newValue : preset,
              ),
            }
          : tab,
      ),
    );
  };

  // Edit tab label
  const handleEditTabLabel = (tabId: string, newLabel: string): void => {
    setPresetTabs((tabs: PresetTab[]) =>
      tabs.map((tab: PresetTab) =>
        tab.id === tabId ? { ...tab, label: newLabel } : tab,
      ),
    );
  };

  // Handle trade submission
  const handleTrade = useCallback(
    (amount: string, isBuy: boolean): void => {
      // Set the amount in parent state and call handleTradeSubmit with the specific amount
      if (isBuy) {
        setBuyAmount(amount);
        // Pass the amount directly to avoid using stale state values
        handleTradeSubmit(wallets, isBuy, selectedDex, amount, undefined);
      } else {
        setSellAmount(amount);
        // Pass the amount directly to avoid using stale state values
        handleTradeSubmit(wallets, isBuy, selectedDex, undefined, amount);
      }
    },
    [
      selectedDex,
      wallets,
      setBuyAmount,
      setSellAmount,
      handleTradeSubmit,
    ],
  );

  // Drag functionality
  const handleMouseDown = (e: React.MouseEvent): void => {
    if (!dragHandleRef.current?.contains(e.target as Node)) return;

    e.preventDefault(); // Prevent text selection during drag
    e.stopPropagation(); // Prevent event bubbling

    onDraggingChange(true);
    const rect = cardRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  const handleMouseMove = React.useCallback(
    (e: MouseEvent): void => {
      if (!isDragging) return;

      const cardWidth = cardRef.current?.offsetWidth || 0;
      const cardHeight = cardRef.current?.offsetHeight || 0;

      if (embedded && containerRef?.current) {
        // Constrain to container bounds for embedded mode
        const containerRect = containerRef.current.getBoundingClientRect();
        const newX = e.clientX - containerRect.left - dragOffset.x;
        const newY = e.clientY - containerRect.top - dragOffset.y;

        const maxX = containerRect.width - cardWidth;
        const maxY = containerRect.height - cardHeight;

        onPositionChange({
          x: Math.max(0, Math.min(newX, maxX)),
          y: Math.max(0, Math.min(newY, maxY)),
        });
      } else {
        // Constrain to viewport for floating mode
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;

        const maxX = window.innerWidth - cardWidth;
        const maxY = window.innerHeight - cardHeight;

        onPositionChange({
          x: Math.max(0, Math.min(newX, maxX)),
          y: Math.max(0, Math.min(newY, maxY)),
        });
      }
    },
    [isDragging, dragOffset.x, dragOffset.y, onPositionChange, embedded, containerRef],
  );

  const handleMouseUp = React.useCallback((): void => {
    onDraggingChange(false);
  }, [onDraggingChange]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
    return undefined;
  }, [isDragging, handleMouseMove, handleMouseUp]);

  if (!isOpen) return null;

  const content = isMobile ? (
    // Mobile: Bottom sheet style
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black-70 z-[9998] md:hidden"
        onClick={onClose}
      />
      {/* Bottom Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[9999] md:hidden mobile-bottom-sheet"
        style={{
          paddingBottom: "max(env(safe-area-inset-bottom), 0px)",
        }}
      >
        <div className="relative overflow-hidden bg-app-primary-99 backdrop-blur-md border-t border-app-primary-30 shadow-lg shadow-black-80 rounded-t-2xl">
          {/* Drag Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1 bg-app-primary-40 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono color-primary font-semibold">
                QUICK TRADE
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Wallet Selector Button - Mobile */}
              <button
                ref={walletButtonRef}
                onClick={() => setShowWalletSelector(!showWalletSelector)}
                className="flex items-center gap-1 px-3 py-2 rounded hover:bg-app-primary-20 transition-colors min-h-[44px]"
              >
                <span className="text-xs font-mono color-primary font-semibold">
                  {countActiveWallets(wallets)}
                </span>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="color-primary"
                >
                  <path
                    d="M21 8V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2h18zM3 10v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-8H3zm13 4h2v2h-2v-2z"
                    fill="currentColor"
                  />
                </svg>
              </button>

              <button
                onClick={() => setIsEditMode(!isEditMode)}
                className={`p-2 rounded transition-all duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center
                            ${
                              isEditMode
                                ? "bg-primary-20 border border-app-primary color-primary"
                                : "hover:bg-primary-20 text-app-secondary-60 hover:color-primary"
                            }`}
              >
                {isEditMode ? <Check size={16} /> : <Edit3 size={16} />}
              </button>

              <button
                onClick={onClose}
                className="p-2 rounded hover:bg-primary-20 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X
                  size={18}
                  className="text-app-secondary-60 hover:color-primary"
                />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-4 pb-6 max-h-[70vh] overflow-y-auto">
            {/* Preset Tabs */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              {presetTabs.map((tab: PresetTab) => (
                <TabButton
                  key={tab.id}
                  label={tab.label}
                  isActive={activeTabId === tab.id}
                  onClick={() => handleTabSwitch(tab.id)}
                  onEdit={(newLabel) => handleEditTabLabel(tab.id, newLabel)}
                  isEditMode={isEditMode}
                />
              ))}
            </div>

            {/* Trading Interface */}
            <div className="space-y-6">
              {/* Buy Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-base font-mono color-primary font-semibold">
                    BUY
                  </span>
                  <span className="text-xs text-app-secondary-60 font-mono">
                    SOL/wallet
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {activeTab.buyPresets.map((preset: string, index: number) => (
                    <PresetButton
                      key={index}
                      value={preset}
                      onExecute={(amount) => handleTrade(amount, true)}
                      onChange={(newValue) =>
                        handleEditBuyPreset(index, newValue)
                      }
                      isLoading={isLoading}
                      variant="buy"
                      isEditMode={isEditMode}
                      isMobile
                    />
                  ))}
                </div>
              </div>

              {/* Sell Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-base font-mono text-error-alt font-semibold">
                    SELL
                  </span>
                  <span className="text-xs text-error-alt-60 font-mono">
                    % tokens
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {activeTab.sellPresets.map(
                    (preset: string, index: number) => (
                      <PresetButton
                        key={index}
                        value={preset}
                        onExecute={(amount) => handleTrade(amount, false)}
                        onChange={(newValue) =>
                          handleEditSellPreset(index, newValue)
                        }
                        isLoading={isLoading}
                        variant="sell"
                        isEditMode={isEditMode}
                        isMobile
                      />
                    ),
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  ) : (
    // Desktop: Floating card (original behavior)
    <div
      ref={cardRef}
      className="fixed z-[9999] select-none hidden md:block"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? "grabbing" : "default",
        pointerEvents: "auto",
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="relative overflow-hidden p-4 rounded-lg w-80 max-w-[90vw] bg-app-primary-99 backdrop-blur-md border border-app-primary-30 shadow-lg shadow-black-80">
        {/* Header with Edit Button */}
        <div className="flex items-center justify-between mb-3">
          <div
            ref={dragHandleRef}
            className="flex items-center gap-2 cursor-grab active:cursor-grabbing px-2 py-1 hover:bg-app-primary-20 rounded transition-colors"
            title="Drag to move"
          >
            <Move size={14} className="text-app-secondary-60" />
            <span className="text-xs font-mono text-app-secondary-60 uppercase">
              Quick Trade
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Wallet Selector Button */}
            <button
              ref={walletButtonRef}
              onClick={() => setShowWalletSelector(!showWalletSelector)}
              className="flex items-center gap-1 px-2 py-1 rounded hover:bg-app-primary-20 transition-colors"
            >
              <span className="text-[10px] font-mono color-primary font-semibold">
                {countActiveWallets(wallets)}
              </span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                className="color-primary"
              >
                <path
                  d="M21 8V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2h18zM3 10v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-8H3zm13 4h2v2h-2v-2z"
                  fill="currentColor"
                />
              </svg>
            </button>

            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={`p-1.5 rounded transition-all duration-200
                        ${
                          isEditMode
                            ? "bg-primary-20 border border-app-primary color-primary"
                            : "hover:bg-primary-20 text-app-secondary-60 hover:color-primary"
                        }`}
            >
              {isEditMode ? <Check size={12} /> : <Edit3 size={12} />}
            </button>

            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-primary-20 transition-colors"
            >
              <X
                size={14}
                className="text-app-secondary-60 hover:color-primary"
              />
            </button>
          </div>
        </div>

        {/* Preset Tabs */}
        <div className="flex gap-1 mb-4">
          {presetTabs.map((tab: PresetTab) => (
            <TabButton
              key={tab.id}
              label={tab.label}
              isActive={activeTabId === tab.id}
              onClick={() => handleTabSwitch(tab.id)}
              onEdit={(newLabel) => handleEditTabLabel(tab.id, newLabel)}
              isEditMode={isEditMode}
            />
          ))}
        </div>

        {/* Trading Interface - Preset Only */}
        <div className="space-y-4 relative z-10">
          {/* Buy Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-mono color-primary">BUY</span>
              <span className="text-xs text-app-secondary-60 font-mono">
                SOL/wallet
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {activeTab.buyPresets.map((preset: string, index: number) => (
                <PresetButton
                  key={index}
                  value={preset}
                  onExecute={(amount) => handleTrade(amount, true)}
                  onChange={(newValue) => handleEditBuyPreset(index, newValue)}
                  isLoading={isLoading}
                  variant="buy"
                  isEditMode={isEditMode}

                />
              ))}
            </div>
          </div>

          {/* Sell Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-mono text-error-alt">SELL</span>
              <span className="text-xs text-error-alt-60 font-mono">
                % tokens
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {activeTab.sellPresets.map((preset: string, index: number) => (
                <PresetButton
                  key={index}
                  value={preset}
                  onExecute={(amount) => handleTrade(amount, false)}
                  onChange={(newValue) => handleEditSellPreset(index, newValue)}
                  isLoading={isLoading}
                  variant="sell"
                  isEditMode={isEditMode}

                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Embedded mode: render inline without portal
  if (embedded) {
    const embeddedContent = (
      <div
        ref={cardRef}
        className="select-none w-full max-w-sm absolute"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          cursor: isDragging ? "grabbing" : "default",
        }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={handleMouseDown}
      >
        <div className="relative overflow-hidden p-4 rounded-lg bg-app-primary-99 backdrop-blur-md border border-app-primary-30 shadow-lg shadow-black-80">
          {/* Header with Edit Button */}
          <div className="flex items-center justify-between mb-3">
            <div
              ref={dragHandleRef}
              className="flex items-center gap-2 cursor-grab active:cursor-grabbing px-2 py-1 hover:bg-app-primary-20 rounded transition-colors"
              title="Drag to move"
            >
              <Move size={14} className="text-app-secondary-60" />
              <span className="text-xs font-mono text-app-secondary-60 uppercase">
                Quick Trade
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Wallet Selector Button */}
              <button
                ref={walletButtonRef}
                onClick={() => setShowWalletSelector(!showWalletSelector)}
                className="flex items-center gap-1 px-2 py-1 rounded hover:bg-app-primary-20 transition-colors"
              >
                <span className="text-[10px] font-mono color-primary font-semibold">
                  {countActiveWallets(wallets)}
                </span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="color-primary"
                >
                  <path
                    d="M21 8V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2h18zM3 10v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-8H3zm13 4h2v2h-2v-2z"
                    fill="currentColor"
                  />
                </svg>
              </button>

              <button
                onClick={() => setIsEditMode(!isEditMode)}
                className={`p-1.5 rounded transition-all duration-200
                          ${
                            isEditMode
                              ? "bg-primary-20 border border-app-primary color-primary"
                              : "hover:bg-primary-20 text-app-secondary-60 hover:color-primary"
                          }`}
              >
                {isEditMode ? <Check size={12} /> : <Edit3 size={12} />}
              </button>

              <button
                onClick={onClose}
                className="p-1 rounded hover:bg-primary-20 transition-colors"
              >
                <X
                  size={14}
                  className="text-app-secondary-60 hover:color-primary"
                />
              </button>
            </div>
          </div>

          {/* Preset Tabs */}
          <div className="flex gap-1 mb-4">
            {presetTabs.map((tab: PresetTab) => (
              <TabButton
                key={tab.id}
                label={tab.label}
                isActive={activeTabId === tab.id}
                onClick={() => handleTabSwitch(tab.id)}
                onEdit={(newLabel) => handleEditTabLabel(tab.id, newLabel)}
                isEditMode={isEditMode}
              />
            ))}
          </div>

          {/* Trading Interface - Preset Only */}
          <div className="space-y-4 relative z-10">
            {/* Buy Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono color-primary">BUY</span>
                <span className="text-xs text-app-secondary-60 font-mono">
                  SOL/wallet
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {activeTab.buyPresets.map((preset: string, index: number) => (
                  <PresetButton
                    key={index}
                    value={preset}
                    onExecute={(amount) => handleTrade(amount, true)}
                    onChange={(newValue) => handleEditBuyPreset(index, newValue)}
                    isLoading={isLoading}
                    variant="buy"
                    isEditMode={isEditMode}
  
                  />
                ))}
              </div>
            </div>

            {/* Sell Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono text-error-alt">SELL</span>
                <span className="text-xs text-error-alt-60 font-mono">
                  % tokens
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {activeTab.sellPresets.map((preset: string, index: number) => (
                  <PresetButton
                    key={index}
                    value={preset}
                    onExecute={(amount) => handleTrade(amount, false)}
                    onChange={(newValue) => handleEditSellPreset(index, newValue)}
                    isLoading={isLoading}
                    variant="sell"
                    isEditMode={isEditMode}
  
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Wallet Selector - rendered inline for embedded mode */}
        {showWalletSelector && (
          <div className="absolute left-0 right-0 bottom-full mb-2 z-50">
            <WalletSelectorPopup
              wallets={wallets}
              baseCurrencyBalances={baseCurrencyBalances}
              tokenBalances={tokenBalances}
              tokenAddress={tokenAddress}
              anchorRef={walletButtonRef}
              onClose={() => setShowWalletSelector(false)}
              onToggleWallet={handleToggleWallet}
              onSelectAll={handleSelectAll}
              onSelectAllWithBalance={handleSelectAllWithBalance}
            />
          </div>
        )}
      </div>
    );

    return embeddedContent;
  }

  // Render to document.body using portal to ensure it floats above everything
  return (
    <>
      {createPortal(content, document.body)}
      {showWalletSelector &&
        createPortal(
          <WalletSelectorPopup
            wallets={wallets}
            baseCurrencyBalances={baseCurrencyBalances}
            tokenBalances={tokenBalances}
            tokenAddress={tokenAddress}
            anchorRef={walletButtonRef}
            onClose={() => setShowWalletSelector(false)}
            onToggleWallet={handleToggleWallet}
            onSelectAll={handleSelectAll}
            onSelectAllWithBalance={handleSelectAllWithBalance}
          />,
          document.body,
        )}
    </>
  );
};

export default FloatingTradingCard;
