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

