/// <reference types="vite/client" />

declare global {
  interface ImportMetaEnv {
    readonly MODE: string;
    readonly BASE_URL: string;
    readonly PROD: boolean;
    readonly DEV: boolean;
    readonly SSR: boolean;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

export { }

declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.jpeg' {
  const content: string;
  export default content;
}

declare module '*.svg' {
  const content: string;
  export default content;
}

declare module 'react-split' {
  import type { ReactNode, CSSProperties } from 'react';

  export interface SplitProps {
    children: ReactNode;
    className?: string;
    style?: CSSProperties;
    sizes?: number[];
    minSize?: number | number[];
    maxSize?: number | number[];
    expandToMin?: boolean;
    gutterSize?: number;
    gutterAlign?: 'center' | 'start' | 'end';
    snapOffset?: number;
    dragInterval?: number;
    direction?: 'horizontal' | 'vertical';
    cursor?: string;
    gutter?: (index: number, direction: 'horizontal' | 'vertical') => HTMLElement;
    elementStyle?: (
      dimension: 'width' | 'height',
      size: number,
      gutterSize: number,
    ) => CSSProperties;
    gutterStyle?: (
      dimension: 'width' | 'height',
      gutterSize: number,
    ) => CSSProperties;
    onDrag?: (sizes: number[]) => void;
    onDragStart?: (sizes: number[]) => void;
    onDragEnd?: (sizes: number[]) => void;
    collapsed?: number;
  }

  export default function Split(props: SplitProps): JSX.Element;
}
