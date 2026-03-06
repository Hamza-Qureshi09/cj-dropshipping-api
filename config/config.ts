import { load } from "@std/dotenv";
import type { AppConfig } from "../types/index.ts";

try {
  await load({ export: true, envPath: ".env.example" });
} catch {
  // No .env file — use system env vars
}

function requireEnv(key: string, fallback?: string): string {
  const value = Deno.env.get(key) ?? fallback;
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

export const config: AppConfig = {
  port: parseInt(Deno.env.get("PORT") ?? "8000"),
  host: Deno.env.get("HOST") ?? "localhost",
  mongoUri: requireEnv("MONGODB_URI", "mongodb://localhost:27017/cj_dropshipping"),
  mongoDbName: requireEnv("MONGODB_DB_NAME", "cj_dropshipping"),
  cjApiKey: requireEnv("CJ_API_KEY"),
  cjBaseUrl: requireEnv("CJ_BASE_URL", "https://developers.cjdropshipping.com/api2.0"),
  jwtSecret: requireEnv("JWT_SECRET", "change_me_in_production"),
  frontendUrl: Deno.env.get("FRONTEND_URL") ?? "http://localhost:3000",
  nodeEnv: Deno.env.get("NODE_ENV") ?? "development",
};
