export interface MultichartToken {
  address: string;
  addedAt: number;
  label?: string;
  symbol?: string;
  imageUrl?: string;
}

export interface MultichartState {
  tokens: MultichartToken[];
  activeTokenIndex: number;
}

export interface MultichartTokenStats {
  address: string;
  price: number | null;
  marketCap: number | null;
  pnl: { bought: number; sold: number; net: number; trades: number } | null;
}
