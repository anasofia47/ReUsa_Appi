import { z } from "zod";
import { ApiError } from "./errors";

const envSchema = z.object({
  FIREBASE_PROJECT_ID: z.string().min(1),
  FIREBASE_CLIENT_EMAIL: z.string().min(1),
  FIREBASE_PRIVATE_KEY: z.string().min(1),
  /** Clave Web API de Firebase para Auth REST */
  FIREBASE_WEB_API_KEY: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;
let cached: Env | null = null;

function cleanEnvValue(val: string): string {
  let cleaned = val.trim();
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1);
  }
  return cleaned.trim();
}

function cleanPrivateKey(key: string): string {
  let cleaned = cleanEnvValue(key);
  cleaned = cleaned.replace(/\\n/g, "\n").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return cleaned;
}

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join("."));
    throw new ApiError(
      500,
      "CONFIG_ERROR",
      `Faltan variables de entorno: ${missing.join(", ")}. Revisa .env`,
    );
  }
  cached = {
    FIREBASE_PROJECT_ID: cleanEnvValue(parsed.data.FIREBASE_PROJECT_ID),
    FIREBASE_CLIENT_EMAIL: cleanEnvValue(parsed.data.FIREBASE_CLIENT_EMAIL),
    FIREBASE_PRIVATE_KEY: cleanPrivateKey(parsed.data.FIREBASE_PRIVATE_KEY),
    FIREBASE_WEB_API_KEY: cleanEnvValue(parsed.data.FIREBASE_WEB_API_KEY),
  };
  return cached;
}
