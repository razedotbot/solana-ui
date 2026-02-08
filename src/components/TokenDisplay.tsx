import React from "react";
import { useTokenMetadata } from "../utils/hooks";
import { formatAddress } from "../utils/formatting";

type TokenDisplayVariant = "full" | "compact" | "inline" | "symbol-only";

interface TokenDisplayProps {
  mint: string;
  variant?: TokenDisplayVariant;
  className?: string;
  showImage?: boolean;
  imageSize?: number;
  fallback?: string;
}

export const TokenDisplay: React.FC<TokenDisplayProps> = ({
  mint,
  variant = "compact",
  className = "",
  showImage = true,
  imageSize = 20,
  fallback,
}) => {
  const { metadata } = useTokenMetadata(mint);

  const abbreviatedAddress = fallback || formatAddress(mint);

  if (!metadata || (!metadata.name && !metadata.symbol)) {
    return (
      <span className={`font-mono ${className}`}>
        {abbreviatedAddress}
      </span>
    );
  }

  if (variant === "symbol-only") {
    return (
      <span className={`font-mono ${className}`}>
        {metadata.symbol || abbreviatedAddress}
      </span>
    );
  }

  if (variant === "inline") {
    return (
      <span className={`inline-flex items-center gap-1.5 ${className}`}>
        {showImage && metadata.image && (
          <img
            src={metadata.image}
            alt={metadata.symbol}
            className="rounded-full object-cover"
            style={{ width: imageSize, height: imageSize }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        )}
        <span className="font-mono">{metadata.symbol || abbreviatedAddress}</span>
      </span>
    );
  }

  if (variant === "compact") {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {showImage && metadata.image && (
          <img
            src={metadata.image}
            alt={metadata.symbol}
            className="rounded-full object-cover flex-shrink-0"
            style={{ width: imageSize, height: imageSize }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        )}
        <div className="flex flex-col min-w-0">
          <span className="font-mono font-bold text-app-primary truncate">
            {metadata.symbol || abbreviatedAddress}
          </span>
          <span className="font-mono text-xs text-app-secondary-60 truncate">
            {abbreviatedAddress}
          </span>
        </div>
      </div>
    );
  }

  // full variant
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {showImage && metadata.image && (
        <img
          src={metadata.image}
          alt={metadata.symbol}
          className="rounded-full object-cover flex-shrink-0"
          style={{ width: imageSize * 1.5, height: imageSize * 1.5 }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      )}
      <div className="flex flex-col min-w-0">
        <span className="font-bold text-app-primary truncate">
          {metadata.name}
        </span>
        <span className="font-mono text-xs text-app-secondary-60 truncate">
          {metadata.symbol} ({abbreviatedAddress})
        </span>
      </div>
    </div>
  );
};
