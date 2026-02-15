/**
 * Loglama Standardı
 * 
 * Bu modül, uygulama genelinde tutarlı loglama için merkezi bir katman sağlar.
 * Gelecekte APM/log management sistemlerine (ELK, Loki, vb.) entegrasyon için hazırlanmıştır.
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context?: Record<string, any>;
  error?: Error;
}

const PII_KEYS = ['tckn', 'tc', 'phone', 'email', 'full_name', 'fullName', 'identityNumber', 'member_email', 'token', 'otp', 'sessionToken'];

function redactPii(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    const keyLower = k.toLowerCase();
    if (PII_KEYS.some((p) => keyLower.includes(p.toLowerCase()) || k === p)) {
      out[k] = '[REDACTED]';
    } else if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Error)) {
      out[k] = redactPii(v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out;
}

class Logger {
  private formatLog(entry: LogEntry): string {
    const { level, message, timestamp, context, error } = entry;

    let logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

    if (context && Object.keys(context).length > 0) {
      const safeContext = redactPii(context as Record<string, unknown>);
      logMessage += ` | Context: ${JSON.stringify(safeContext)}`;
    }

    if (error) {
      logMessage += ` | Error: ${error.message}`;
      if (error.stack && process.env.NODE_ENV === 'development') {
        logMessage += ` | Stack: ${error.stack}`;
      }
    }

    return logMessage;
  }

  private writeLog(entry: LogEntry): void {
    const formatted = this.formatLog(entry);

    switch (entry.level) {
      case LogLevel.DEBUG:
        if (process.env.NODE_ENV === 'development') {
          console.debug(formatted);
        }
        break;
      case LogLevel.INFO:
        console.info(formatted);
        break;
      case LogLevel.WARN:
        console.warn(formatted);
        break;
      case LogLevel.ERROR:
        console.error(formatted);
        // Gelecekte burada error tracking servisine (Sentry, vb.) gönderilebilir
        break;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  debug(message: string, context?: Record<string, any>): void {
    this.writeLog({
      level: LogLevel.DEBUG,
      message,
      timestamp: new Date().toISOString(),
      context,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  info(message: string, context?: Record<string, any>): void {
    this.writeLog({
      level: LogLevel.INFO,
      message,
      timestamp: new Date().toISOString(),
      context,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  warn(message: string, context?: Record<string, any>): void {
    this.writeLog({
      level: LogLevel.WARN,
      message,
      timestamp: new Date().toISOString(),
      context,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error(message: string, error?: Error, context?: Record<string, any>): void {
    this.writeLog({
      level: LogLevel.ERROR,
      message,
      timestamp: new Date().toISOString(),
      error,
      context,
    });
  }

  /**
   * Admin işlemleri için özel log fonksiyonu
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminAction(action: string, adminId: string, details?: Record<string, any>): void {
    this.info(`Admin Action: ${action}`, {
      adminId,
      action,
      ...details,
    });
  }

  /**
   * Kritik güvenlik olayları için log
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  securityEvent(event: string, details?: Record<string, any>): void {
    this.warn(`Security Event: ${event}`, details);
  }

  /**
   * Başvuru işlemleri için log
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  applicationEvent(event: string, applicationId?: string, details?: Record<string, any>): void {
    this.info(`Application Event: ${event}`, {
      applicationId,
      event,
      ...details,
    });
  }
}

// Singleton instance
export const logger = new Logger();
