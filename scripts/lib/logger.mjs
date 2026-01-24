/**
 * Simple, colorful logger utility
 */

const COLORS = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
};

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  SUCCESS: 2,
  WARN: 3,
  ERROR: 4,
};

class Logger {
  constructor(level = "INFO") {
    this.level = LOG_LEVELS[level] || LOG_LEVELS.INFO;
  }

  setLevel(level) {
    this.level = LOG_LEVELS[level] || LOG_LEVELS.INFO;
  }

  _log(level, color, prefix, ...args) {
    if (LOG_LEVELS[level] >= this.level) {
      const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
      console.log(
        `${COLORS.dim}[${timestamp}]${COLORS.reset} ${color}${prefix}${COLORS.reset}`,
        ...args
      );
    }
  }

  debug(...args) {
    this._log("DEBUG", COLORS.cyan, "[DEBUG]", ...args);
  }

  info(...args) {
    this._log("INFO", COLORS.blue, "[INFO] ", ...args);
  }

  success(...args) {
    this._log("SUCCESS", COLORS.green, "[SUCCESS]", ...args);
  }

  warn(...args) {
    this._log("WARN", COLORS.yellow, "[WARN] ", ...args);
  }

  error(...args) {
    this._log("ERROR", COLORS.red, "[ERROR]", ...args);
  }
}

export const logger = new Logger(process.env.LOG_LEVEL || "INFO");
