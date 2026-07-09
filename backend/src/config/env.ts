export type BackendEnv = {
  host: string;
  httpPort: number;
  wsPort: number;
};

const DEFAULT_HOST = "0.0.0.0";
const DEFAULT_HTTP_PORT = 3000;
const DEFAULT_WS_PORT = 3001;

const readPort = (name: string, fallback: number): number => {
  const rawValue = process.env[name];

  if (rawValue === undefined || rawValue.trim() === "") {
    return fallback;
  }

  const parsed = Number(rawValue);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`${name} must be an integer between 1 and 65535.`);
  }

  return parsed;
};

export const loadEnv = (): BackendEnv => ({
  host: process.env.HOST?.trim() || DEFAULT_HOST,
  httpPort: readPort("HTTP_PORT", DEFAULT_HTTP_PORT),
  wsPort: readPort("WS_PORT", DEFAULT_WS_PORT)
});
