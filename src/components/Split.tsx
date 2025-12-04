import React from 'react';
import OriginalSplit from 'react-split';
import type { SplitProps } from 'react-split';

/**
 * Wrapper for react-split component.
 */
export const Split: React.FC<SplitProps> = (props) => {
  return <OriginalSplit {...props} />;
};

export default Split;
