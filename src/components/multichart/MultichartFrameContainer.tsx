import React, { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { GripVertical, X, Maximize2, Minimize2, Zap } from "lucide-react";
import { useMultichart } from "../../contexts/useMultichart";
import { brand } from "../../utils/brandConfig";
import { executeTrade } from "../../utils/trading";
import { useToast } from "../../utils/hooks/useToast";
import FloatingTradingCard from "../FloatingTradingCard";
import type { WalletType } from "../../utils/types";
import { MONITOR_SLOT } from "./constants";

interface MultichartFrameContainerProps {
  wallets: WalletType[];
  setWallets: (wallets: WalletType[]) => void;
  isLoadingChart: boolean;
  baseCurrencyBalances: Map<string, number>;
  tokenBalances: Map<string, number>;
  currentMarketCap: number | null;
  onNonWhitelistedTrade?: (trade: {
    type: "buy" | "sell";
    address: string;
    tokensAmount: number;
    avgPrice: number;
    solAmount: number;
    timestamp: number;
    signature: string;
    tokenMint: string;
    marketCap: number;
  }) => void;
}

const buildIframeUrl = (tokenAddress: string): string => {
  const params = new URLSearchParams();
  params.set("theme", brand.theme.name);
  if (tokenAddress && tokenAddress !== MONITOR_SLOT) {
    params.set("tokenMint", tokenAddress);
    params.set("view", "simple");
  }
  return `https://frame.raze.sh/sol/?${params.toString()}`;
};

// Calculate grid layout (rows x cols)
const getGridLayout = (count: number): { rows: number; cols: number } => {
  if (count <= 1) return { rows: 1, cols: 1 };
  if (count === 2) return { rows: 1, cols: 2 };
  if (count <= 4) return { rows: 2, cols: 2 };
  if (count <= 6) return { rows: 2, cols: 3 };
  if (count <= 9) return { rows: 3, cols: 3 };
  return { rows: Math.ceil(count / 4), cols: 4 };
};

export const MultichartFrameContainer: React.FC<MultichartFrameContainerProps> = ({
  wallets,
  setWallets,
  isLoadingChart,
  baseCurrencyBalances,
  tokenBalances,
  currentMarketCap,
  onNonWhitelistedTrade,
}) => {
  const { addToken, tokens, removeToken, reorderTokens, replaceToken } = useMultichart();
  const { showToast } = useToast();

  // Drag-to-reorder state
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [expandedToken, setExpandedToken] = useState<string | null>(null);

  // Trading card state
  const [tradingCardOpen, setTradingCardOpen] = useState(false);
  const [tradingCardToken, setTradingCardToken] = useState<string>("");
  const [selectedDex, setSelectedDex] = useState("pump");
  const [isDexDropdownOpen, setIsDexDropdownOpen] = useState(false);
  const [buyAmount, setBuyAmount] = useState("0.1");
  const [sellAmount, setSellAmount] = useState("100");
  const [isTrading, setIsTrading] = useState(false);
  const [tradingCardPosition, setTradingCardPosition] = useState({ x: 20, y: 40 });
  const [tradingCardDragging, setTradingCardDragging] = useState(false);
  const tradingCardContainerRef = useRef<HTMLDivElement>(null);

  const isDraggingRef = useRef(false);
  const iframeRefs = useRef<Map<string, HTMLIFrameElement>>(new Map());
  const gridItemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate grid dimensions
  const { rows, cols } = useMemo(() => getGridLayout(tokens.length), [tokens.length]);

  // Cleanup stale refs when tokens change
  useEffect(() => {
    const tokenAddresses = new Set(tokens.map(t => t.address));
    for (const address of gridItemRefs.current.keys()) {
      if (!tokenAddresses.has(address)) {
        gridItemRefs.current.delete(address);
      }
    }
  }, [tokens]);

  // Iframe message handlers
  useEffect(() => {
    interface IframeMessage {
      type?: string;
      tokenAddress?: string;
      data?: {
        type: "buy" | "sell";
        address: string;
        tokensAmount: number;
        avgPrice: number;
        solAmount: number;
        timestamp: number;
        signature: string;
        tokenMint: string;
        marketCap: number;
      };
    }

    const handleMessage = (event: MessageEvent<IframeMessage>): void => {
      const msgData = event.data;
      if (!msgData?.type) return;

      // Find which iframe sent the message
      let sourceAddress: string | null = null;
      iframeRefs.current.forEach((iframe, address) => {
        if (iframe?.contentWindow === event.source) {
          sourceAddress = address;
        }
      });
      if (!sourceAddress) return;

      if (msgData.type === "TOKEN_SELECTED" && typeof msgData.tokenAddress === "string") {
        const newTokenAddress = msgData.tokenAddress;

        // If the message came from a MONITOR_SLOT, replace it with the selected token
        if (sourceAddress === MONITOR_SLOT) {
          replaceToken(MONITOR_SLOT, newTokenAddress);
        } else {
          // From a regular token iframe - add as new token
          addToken(newTokenAddress);
        }
      }
      if (msgData.type === "NON_WHITELIST_TRADE" && onNonWhitelistedTrade && msgData.data) {
        onNonWhitelistedTrade(msgData.data);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [addToken, replaceToken, onNonWhitelistedTrade]);

  // Send wallets to iframes
  useEffect(() => {
    const handleIframeReady = (event: MessageEvent<{ type: string }>): void => {
      if (event.data?.type === "IFRAME_READY") {
        iframeRefs.current.forEach((iframe) => {
          if (iframe?.contentWindow === event.source) {
            const walletData = wallets.map((w) => ({
              address: w.address,
              label: w.label || `${w.address.slice(0, 3)}...${w.address.slice(-3)}`,
            }));
            iframe.contentWindow?.postMessage({ type: "ADD_WALLETS", wallets: walletData }, "*");
          }
        });
      }
    };
    window.addEventListener("message", handleIframeReady);
    return () => window.removeEventListener("message", handleIframeReady);
  }, [wallets]);

  // Drag-to-reorder handlers - disabled when any token is expanded
  const handleDragStart = useCallback((e: React.MouseEvent, index: number) => {
    if (expandedToken) return;
    e.preventDefault();
    setDragIndex(index);
    isDraggingRef.current = true;
  }, [expandedToken]);

  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current || dragIndex === null) return;

    const draggedToken = tokens[dragIndex];
    if (!draggedToken) return;

    for (const [address, el] of gridItemRefs.current.entries()) {
      if (el && address !== draggedToken.address) {
        const rect = el.getBoundingClientRect();
        if (e.clientX >= rect.left && e.clientX <= rect.right &&
            e.clientY >= rect.top && e.clientY <= rect.bottom) {
          // Find the index of this token
          const targetIndex = tokens.findIndex(t => t.address === address);
          if (targetIndex !== -1) {
            setDragOverIndex(targetIndex);
            return;
          }
        }
      }
    }
    setDragOverIndex(null);
  }, [dragIndex, tokens]);

  const handleDragEnd = useCallback(() => {
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      reorderTokens(dragIndex, dragOverIndex);
    }
    setDragIndex(null);
    setDragOverIndex(null);
    isDraggingRef.current = false;
  }, [dragIndex, dragOverIndex, reorderTokens]);

  useEffect(() => {
    if (dragIndex === null) return;
    window.addEventListener("mousemove", handleDragMove);
    window.addEventListener("mouseup", handleDragEnd);
    return () => {
      window.removeEventListener("mousemove", handleDragMove);
      window.removeEventListener("mouseup", handleDragEnd);
    };
  }, [dragIndex, handleDragMove, handleDragEnd]);

  // Ref setters
  const setIframeRef = useCallback(
    (address: string) => (el: HTMLIFrameElement | null) => {
      if (el) iframeRefs.current.set(address, el);
      else iframeRefs.current.delete(address);
    },
    [],
  );

  const setGridItemRef = useCallback(
    (address: string) => (el: HTMLDivElement | null) => {
      if (el) gridItemRefs.current.set(address, el);
      else gridItemRefs.current.delete(address);
    },
    [],
  );

  const handleRemoveToken = useCallback((address: string) => {
    removeToken(address);
    if (expandedToken === address) setExpandedToken(null);
  }, [removeToken, expandedToken]);

  const handleToggleExpand = useCallback((address: string) => {
    setExpandedToken((prev) => (prev === address ? null : address));
  }, []);

  // Open trading card for a specific token
  const handleOpenTradingCard = useCallback((address: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTradingCardToken(address);
    setTradingCardPosition({ x: 20, y: 40 }); // Reset position for new token
    setTradingCardOpen(true);
  }, []);

  // Count active wallets
  const countActiveWallets = useCallback((walletList: WalletType[]): number => {
    return walletList.filter((w) => w.isActive && !w.isArchived).length;
  }, []);

  // Handle trade submission - executes actual trades
  const handleTradeSubmit = useCallback(
    async (
      tradeWallets: WalletType[],
      isBuy: boolean,
      dex?: string,
      tradeBuyAmount?: string,
      tradeSellAmount?: string
    ) => {
      if (!tradingCardToken || tradingCardToken === MONITOR_SLOT) {
        showToast("Please select a token first", "error");
        return;
      }

      setIsTrading(true);

      try {
        const dexToUse = dex || selectedDex;
        const config = {
          tokenAddress: tradingCardToken,
          ...(isBuy
            ? { solAmount: parseFloat(tradeBuyAmount || buyAmount || "0") }
            : { sellPercent: parseFloat(tradeSellAmount || sellAmount || "0") }),
        };

        const result = await executeTrade(
          dexToUse,
          tradeWallets,
          config,
          isBuy,
          baseCurrencyBalances,
        );

        if (result.success) {
          showToast(
            `${isBuy ? "Buy" : "Sell"} successful`,
            "success"
          );
        } else {
          showToast(
            result.error || `${isBuy ? "Buy" : "Sell"} failed`,
            "error"
          );
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        showToast(`Error: ${errorMessage}`, "error");
      } finally {
        setIsTrading(false);
      }
    },
    [tradingCardToken, selectedDex, buyAmount, sellAmount, baseCurrencyBalances, showToast],
  );

  const isDragging = dragIndex !== null;

  // Find expanded token index
  const expandedIndex = expandedToken ? tokens.findIndex(t => t.address === expandedToken) : -1;

  // Calculate grid position for each token - using CSS Grid to avoid DOM reordering
  const getGridPosition = useCallback((tokenIndex: number, tokenAddress: string): {
    gridRow: string;
    gridColumn: string;
    isInExpandedRow: boolean;
  } => {
    const isExpanded = tokenAddress === expandedToken;

    if (expandedIndex >= 0) {
      // Expanded layout
      if (isExpanded) {
        // Expanded token takes full first row
        return { gridRow: '1', gridColumn: '1 / -1', isInExpandedRow: true };
      }

      // Other tokens - calculate position excluding the expanded one
      const otherTokens = tokens.filter((_, i) => i !== expandedIndex);
      const posInOthers = otherTokens.findIndex(t => t.address === tokenAddress);
      if (posInOthers === -1) return { gridRow: '1', gridColumn: '1', isInExpandedRow: false };

      const row = Math.floor(posInOthers / cols) + 2; // +2 because row 1 is expanded
      const col = (posInOthers % cols) + 1;
      return { gridRow: String(row), gridColumn: String(col), isInExpandedRow: false };
    }

    // Normal layout
    const row = Math.floor(tokenIndex / cols) + 1;
    const col = (tokenIndex % cols) + 1;
    return { gridRow: String(row), gridColumn: String(col), isInExpandedRow: false };
  }, [expandedToken, expandedIndex, tokens, cols]);

  // Calculate grid template
  const gridTemplate = useMemo(() => {
    if (expandedIndex >= 0) {
      const otherTokensCount = tokens.length - 1;
      const otherRows = Math.ceil(otherTokensCount / cols);
      // Expanded row gets 60%, others share 40%
      const otherRowHeight = otherRows > 0 ? 40 / otherRows : 0;
      const rowTemplate = ['60%', ...Array<string>(otherRows).fill(`${otherRowHeight}%`)].join(' ');
      return {
        gridTemplateRows: rowTemplate,
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
      };
    }

    // Normal layout - equal sized cells
    return {
      gridTemplateRows: `repeat(${rows}, 1fr)`,
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
    };
  }, [expandedIndex, tokens.length, cols, rows]);

  // When no tokens, show monitor iframe
  if (tokens.length === 0) {
    return (
      <div
        ref={containerRef}
        className="flex-1 p-3 overflow-auto"
        style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 100%)' }}
      >
        <div
          className="h-full rounded-xl overflow-hidden"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.05)' }}
        >
          <iframe
            ref={setIframeRef("monitor")}
            src={buildIframeUrl("")}
            className="w-full h-full border-0"
            allow="clipboard-read; clipboard-write; fullscreen"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation"
          />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 p-3 overflow-hidden flex flex-col relative"
      style={{
        background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 100%)',
      }}
    >
      {isLoadingChart && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-30">
          <div className="w-10 h-10 rounded-full border-2 border-t-app-primary-color border-r-app-primary-color border-b-transparent border-l-transparent animate-spin" />
        </div>
      )}

      {/* CSS Grid - flat rendering to prevent iframe recreation */}
      <div
        className="flex-1 min-h-0"
        style={{
          display: 'grid',
          ...gridTemplate,
          gap: '4px',
        }}
      >
        {/* Render tokens in stable order (by address) to prevent DOM reordering */}
        {[...tokens].sort((a, b) => a.address.localeCompare(b.address)).map((token) => {
          const globalIndex = tokens.findIndex(t => t.address === token.address);
          const isThisDragging = dragIndex === globalIndex;
          const isThisDragOver = dragOverIndex === globalIndex && !isThisDragging;
          const isExpanded = expandedToken === token.address;
          const gridPos = getGridPosition(globalIndex, token.address);

          return (
            <div
              key={token.address}
              ref={setGridItemRef(token.address)}
              className={`
                relative flex flex-col rounded-lg overflow-hidden min-w-0
                ${isThisDragging ? "opacity-50" : ""}
              `}
              style={{
                ...gridPos,
                boxShadow: isThisDragging
                  ? '0 0 20px rgba(var(--color-primary-rgb, 0,255,136), 0.3)'
                  : '0 2px 8px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.05)',
                transition: isThisDragging ? 'none' : 'box-shadow 0.2s ease',
              }}
            >
              <div
                onMouseDown={(e) => handleDragStart(e, globalIndex)}
                className={`
                  flex items-center justify-between gap-2 px-2 py-1.5
                  bg-gradient-to-r from-app-primary-80 to-app-primary-90
                  border-b border-white/5
                  ${expandedToken ? "cursor-default" : isDragging ? "cursor-grabbing" : "cursor-grab"}
                  select-none flex-shrink-0
                `}
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <GripVertical
                    size={14}
                    className={`flex-shrink-0 transition-colors ${expandedToken ? "text-app-secondary-60 opacity-30" : isDragging ? "color-primary" : "text-app-secondary-40"}`}
                  />
                  {token.address !== MONITOR_SLOT && token.imageUrl && (
                    <img
                      src={token.imageUrl}
                      alt={token.symbol || ""}
                      className="w-4 h-4 rounded-full object-cover flex-shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  )}
                  <span className="text-xs font-mono font-medium text-app-primary truncate">
                    {token.address === MONITOR_SLOT
                      ? "Browse"
                      : token.symbol || `${token.address.slice(0, 4)}...${token.address.slice(-3)}`}
                  </span>
                </div>

                <div className="flex items-center flex-shrink-0">
                  {/* Trade button - only show for real tokens, not monitor slots */}
                  {token.address !== MONITOR_SLOT && (
                    <button
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => handleOpenTradingCard(token.address, e)}
                      className="p-1 rounded hover:bg-app-primary-color/20 transition-colors"
                      title="Quick Trade"
                    >
                      <Zap size={12} className="text-app-primary-color hover:text-app-primary-color" />
                    </button>
                  )}
                  <button
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={() => handleToggleExpand(token.address)}
                    className="p-1 rounded hover:bg-white/10 transition-colors"
                    title={isExpanded ? "Minimize" : "Expand"}
                  >
                    {isExpanded ? (
                      <Minimize2 size={12} className="text-app-secondary-40 hover:text-app-primary" />
                    ) : (
                      <Maximize2 size={12} className="text-app-secondary-40 hover:text-app-primary" />
                    )}
                  </button>
                  <button
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={() => handleRemoveToken(token.address)}
                    className="p-1 rounded hover:bg-red-500/20 transition-colors"
                    title="Remove"
                  >
                    <X size={12} className="text-app-secondary-40 hover:text-red-400" />
                  </button>
                </div>
              </div>

              {/* Chart */}
              <div className="flex-1 relative min-h-0 bg-app-primary">
                <iframe
                  ref={setIframeRef(token.address)}
                  src={buildIframeUrl(token.address)}
                  className="absolute inset-0 w-full h-full border-0"
                  allow="clipboard-read; clipboard-write; fullscreen"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation"
                />
                {isDragging && <div className="absolute inset-0 z-10" />}
              </div>

              {/* Drop indicator */}
              {isThisDragOver && (
                <div className="absolute inset-0 rounded-lg pointer-events-none z-20 flex items-center justify-center bg-app-primary-color/10 backdrop-blur-[2px]">
                  <div className="px-3 py-1.5 rounded bg-app-primary/90 border border-app-primary-color shadow-xl">
                    <span className="text-xs font-mono color-primary font-medium">Drop to swap</span>
                  </div>
                </div>
              )}

              {/* Trading Card - inside the token box */}
              {tradingCardOpen && tradingCardToken === token.address && (
                <div
                  ref={tradingCardContainerRef}
                  className="absolute inset-0 z-30 bg-black/40 backdrop-blur-[2px] rounded-lg overflow-hidden"
                >
                  <FloatingTradingCard
                    isOpen={true}
                    onClose={() => setTradingCardOpen(false)}
                    position={tradingCardPosition}
                    onPositionChange={setTradingCardPosition}
                    isDragging={tradingCardDragging}
                    onDraggingChange={setTradingCardDragging}
                    tokenAddress={token.address}
                    wallets={wallets}
                    setWallets={setWallets}
                    selectedDex={selectedDex}
                    setSelectedDex={setSelectedDex}
                    isDropdownOpen={isDexDropdownOpen}
                    setIsDropdownOpen={setIsDexDropdownOpen}
                    buyAmount={buyAmount}
                    setBuyAmount={setBuyAmount}
                    sellAmount={sellAmount}
                    setSellAmount={setSellAmount}
                    handleTradeSubmit={handleTradeSubmit}
                    isLoading={isTrading}
                    countActiveWallets={countActiveWallets}
                    currentMarketCap={currentMarketCap}
                    baseCurrencyBalances={baseCurrencyBalances}
                    tokenBalances={tokenBalances}
                    embedded={true}
                    containerRef={tradingCardContainerRef}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
