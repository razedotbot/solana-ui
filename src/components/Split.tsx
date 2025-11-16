import React from 'react';
import OriginalSplit from 'react-split';
import type { SplitProps } from 'react-split';

/**
 * Wrapper for react-split that ensures touchstart event listeners are passive.
 * The actual passive event handling is done via a global patch in utils/passiveTouchPatch.ts
 * which is imported at the application entry point.
 */
export const Split: React.FC<SplitProps> = (props) => {
  return <OriginalSplit {...props} />;
};

export default Split;
