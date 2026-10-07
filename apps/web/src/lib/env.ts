import { z } from 'zod';

const envSchema = z.object({
  // Public variables
  // 기본값은 같은 오리진의 /api. next.config.js의 rewrite가 API 서버로 넘긴다.
  // 절대 URL을 넣으면 그 주소로 직접 호출한다(별도 도메인에 API를 둘 때).
  NEXT_PUBLIC_API_URL: z
    .string()
    .refine(
      (value) => value.startsWith('/') || URL.canParse(value),
      'Invalid API URL: 상대 경로(/api)이거나 절대 URL이어야 합니다',
    )
    .default('/api'),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url('Invalid Sentry DSN').optional(),
  NEXT_PUBLIC_GA_ID: z.string().optional(),

  // Server-only variables (never exposed to client)
  SENTRY_AUTH_TOKEN: z.string().optional(),
});

type Env = z.infer<typeof envSchema>;

let validatedEnv: Env | null = null;

export function getEnv(): Env {
  if (validatedEnv) {
    return validatedEnv;
  }

  try {
    validatedEnv = envSchema.parse({
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
      NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
      NEXT_PUBLIC_GA_ID: process.env.NEXT_PUBLIC_GA_ID,
      SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
    });

    return validatedEnv;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missing = error.issues
        .map(e => `${e.path.join('.')}: ${e.message}`)
        .join('\n');
      throw new Error(`Environment variable validation failed:\n${missing}`);
    }
    throw error;
  }
}

// Type-safe access
export const env = {
  get apiUrl() {
    return getEnv().NEXT_PUBLIC_API_URL;
  },
  get sentryDsn() {
    return getEnv().NEXT_PUBLIC_SENTRY_DSN;
  },
  get gaId() {
    return getEnv().NEXT_PUBLIC_GA_ID;
  },
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
};
