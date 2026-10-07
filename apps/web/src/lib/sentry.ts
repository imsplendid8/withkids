import * as Sentry from '@sentry/nextjs';
import { env } from './env';

export function initSentry() {
  if (!env.sentryDsn || env.isDevelopment) {
    return;
  }

  Sentry.init({
    dsn: env.sentryDsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: env.isProduction ? 0.1 : 1.0,
    enabled: env.isProduction,

    // Ignore certain errors
    ignoreErrors: [
      // Network errors are often not actionable
      /NetworkError/i,
      /Failed to fetch/i,
      /ERR_INTERNET_DISCONNECTED/i,
      // Browser extensions
      /top\.GLOBALS/,
      // Random plugins/extensions
      /originalCreateNotification/,
      /canvas.contentDocument/,
      /MyApp_RemoveAllHighlights/,
    ],
  });
}

// Helper functions for error tracking
export function captureException(
  error: Error,
  context?: Record<string, unknown>
) {
  Sentry.withScope(scope => {
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setContext(key, { value });
      });
    }
    Sentry.captureException(error);
  });
}

export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  Sentry.captureMessage(message, level);
}

export function setUser(userId: string | null, email?: string) {
  if (!userId) {
    Sentry.setUser(null);
    return;
  }

  Sentry.setUser({
    id: userId,
    email,
  });
}

export function clearUser() {
  Sentry.setUser(null);
}
