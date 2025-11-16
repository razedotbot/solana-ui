/**
 * Global patch for making touch event listeners passive by default
 * This fixes the react-split library's non-passive touchstart warnings
 * 
 * This must be imported early in the application lifecycle, before react-split initializes
 */

// Store the original addEventListener
// eslint-disable-next-line @typescript-eslint/unbound-method
const originalAddEventListener = EventTarget.prototype.addEventListener;
// eslint-disable-next-line @typescript-eslint/unbound-method
const originalRemoveEventListener = EventTarget.prototype.removeEventListener;

// Map to track which listeners have been converted to passive
const passiveEvents = ['touchstart', 'touchmove', 'touchend', 'wheel'];

// Override addEventListener globally
EventTarget.prototype.addEventListener = function (
  this: EventTarget,
  type: string,
  listener: EventListenerOrEventListenerObject | null,
  options?: boolean | AddEventListenerOptions
): void {
  // Check if this is a touch/wheel event that should be passive
  if (passiveEvents.includes(type)) {
    let optionsToUse: AddEventListenerOptions;
    
    if (typeof options === 'boolean') {
      // If options is a boolean (capture flag), convert to object
      optionsToUse = {
        capture: options,
        passive: true,
      };
    } else if (options === undefined) {
      // If no options provided, default to passive
      optionsToUse = {
        passive: true,
      };
    } else {
      // If options is an object, add passive unless explicitly set to false
      optionsToUse = {
        ...options,
        passive: options.passive !== false,
      };
    }
    
    return originalAddEventListener.call(this, type, listener, optionsToUse);
  }
  
  // For other event types, use original behavior
  return originalAddEventListener.call(this, type, listener, options);
};

// Keep removeEventListener working normally
EventTarget.prototype.removeEventListener = function (
  this: EventTarget,
  type: string,
  listener: EventListenerOrEventListenerObject | null,
  options?: boolean | EventListenerOptions
): void {
  return originalRemoveEventListener.call(this, type, listener, options);
};

// Export a function to verify the patch is active (for debugging)
export const isPassiveTouchPatchActive = (): boolean => {
  return EventTarget.prototype.addEventListener !== originalAddEventListener;
};

// Log that the patch has been applied
if (process.env['NODE_ENV'] === 'development') {
  // eslint-disable-next-line no-console
  console.log('[PassiveTouchPatch] Touch events will be passive by default');
}

