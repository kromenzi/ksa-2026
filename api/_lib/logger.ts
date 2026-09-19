export type LogContext = Record<string, unknown>;

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return { message: String(error) };
}

function write(level: "info" | "warn" | "error", event: string, context: LogContext = {}) {
  const payload = {
    level,
    event,
    timestamp: new Date().toISOString(),
    ...context,
  };
  const line = JSON.stringify(payload);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  info(event: string, context?: LogContext) { write("info", event, context); },
  warn(event: string, context?: LogContext) { write("warn", event, context); },
  error(event: string, error: unknown, context: LogContext = {}) {
    write("error", event, { ...context, error: normalizeError(error) });
  },
};

export function requestId(req: { headers?: Record<string, string | string[] | undefined> }) {
  const header = req.headers?.["x-vercel-id"] ?? req.headers?.["x-request-id"];
  return Array.isArray(header) ? header[0] : header || crypto.randomUUID();
}
