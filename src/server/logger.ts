import winston from "winston";

const dev = process.env.NODE_ENV !== "production";

/** JSON logs in production (for CloudWatch or similar), readable lines in development. */
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL ?? (dev ? "debug" : "info"),
  format: dev
    ? winston.format.combine(
        winston.format.errors({ stack: true }),
        winston.format.colorize(),
        winston.format.timestamp({ format: "HH:mm:ss" }),
        winston.format.printf(({ level, message, timestamp, ...meta }) => {
          const extra = Object.keys(meta).length
            ? ` ${JSON.stringify(meta, errorReplacer)}`
            : "";
          return `${timestamp} ${level} ${message}${extra}`;
        }),
      )
    : winston.format.combine(
        winston.format.errors({ stack: true }),
        winston.format.timestamp(),
        winston.format.json({ replacer: errorReplacer }),
      ),
  transports: [new winston.transports.Console()],
});

function errorReplacer(_key: string, value: unknown) {
  if (value instanceof Error)
    return { name: value.name, message: value.message, stack: value.stack };
  return value;
}
