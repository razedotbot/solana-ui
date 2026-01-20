/**
 * Application Logger
 *
 * Provides consistent, prefixed logging across the application.
 * In production, only errors and warnings are logged.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LoggerOptions {
  prefix: string;
  enabled?: boolean;
}

interface Logger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  log: (level: LogLevel, ...args: unknown[]) => void;
}

const isDevelopment = process.env["NODE_ENV"] === "development";

/**
 * Create a prefixed logger for a specific module
 */
export const createLogger = (options: LoggerOptions): Logger => {
  const { prefix, enabled = true } = options;
  const tag = `[${prefix}]`;

  return {
    debug: (...args: unknown[]): void => {
      if (enabled && isDevelopment) {
        // eslint-disable-next-line no-console
        console.debug(tag, ...args);
      }
    },

    info: (...args: unknown[]): void => {
      if (enabled && isDevelopment) {
        // eslint-disable-next-line no-console
        console.info(tag, ...args);
      }
    },

    warn: (...args: unknown[]): void => {
      if (enabled) {
        // eslint-disable-next-line no-console
        console.warn(tag, ...args);
      }
    },

    error: (...args: unknown[]): void => {
      if (enabled) {
        // eslint-disable-next-line no-console
        console.error(tag, ...args);
      }
    },

    log: (level: LogLevel, ...args: unknown[]): void => {
      switch (level) {
        case "debug":
          // eslint-disable-next-line no-console
          if (enabled && isDevelopment) console.debug(tag, ...args);
          break;
        case "info":
          // eslint-disable-next-line no-console
          if (enabled && isDevelopment) console.info(tag, ...args);
          break;
        case "warn":
          // eslint-disable-next-line no-console
          if (enabled) console.warn(tag, ...args);
          break;
        case "error":
          // eslint-disable-next-line no-console
          if (enabled) console.error(tag, ...args);
          break;
      }
    },
  };
};

// Pre-configured loggers for common modules
export const tradingLogger = createLogger({ prefix: "Trading" });
export const storageLogger = createLogger({ prefix: "Storage" });
export const walletLogger = createLogger({ prefix: "Wallet" });
export const websocketLogger = createLogger({ prefix: "WebSocket" });
export const automationLogger = createLogger({ prefix: "Automation" });
