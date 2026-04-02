import type { ServerInfo } from "./types";

export const normalizeServerUrl = (url: string): string =>
  url.replace(/\/+$/, "");

export const pingHealthyServer = async (
  url: string,
  timeoutMs: number = 3000,
): Promise<number> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    const controller = new AbortController();
    timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const start = performance.now();
    const response = await fetch(`${normalizeServerUrl(url)}/health`, {
      signal: controller.signal,
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      return Infinity;
    }

    const data = (await response.json()) as { status?: string };
    if (data.status !== "healthy") {
      return Infinity;
    }

    return Math.round(performance.now() - start);
  } catch {
    return Infinity;
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
};

export const discoverHealthyServers = async (
  servers: readonly ServerInfo[],
  timeoutMs: number = 3000,
): Promise<ServerInfo[]> => {
  const serversWithPing = await Promise.all(
    servers.map(async (server) => {
      const ping = await pingHealthyServer(server.url, timeoutMs);
      return {
        ...server,
        url: normalizeServerUrl(server.url),
        ping,
      };
    }),
  );

  return serversWithPing
    .filter((server) => (server.ping ?? Infinity) < Infinity)
    .sort((a, b) => (a.ping ?? Infinity) - (b.ping ?? Infinity));
};

export const isSameServerUrl = (
  left?: string | null,
  right?: string | null,
): boolean => {
  if (!left || !right) {
    return false;
  }

  return normalizeServerUrl(left) === normalizeServerUrl(right);
};
