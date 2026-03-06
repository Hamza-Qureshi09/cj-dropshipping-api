import { config } from "../config/config.ts";
import { getDB } from "../utils/database.ts";
import type { CJApiResponse, CJAuthToken, TokenDocument } from "../types/index.ts";

const TOKEN_COLLECTION = "cj_tokens";
// Refresh when less than 1 hour of validity remains
const BUFFER_MS = 60 * 60 * 1000;

// Internal fetch helpers
async function fetchNewToken(): Promise<CJAuthToken> {
  console.log("Fetching new CJ access token...");

  const res = await fetch(`${config.cjBaseUrl}/v1/authentication/getAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey: config.cjApiKey }),
  });

  const json: CJApiResponse<CJAuthToken> = await res.json();
  if (!json.result || json.code !== 200 || !json.data) {
    throw new Error(`CJ auth failed: ${json.message} (code ${json.code})`);
  }

  console.log("New CJ access token obtained");
  return json.data;
}

async function refreshToken(refreshToken: string): Promise<CJAuthToken> {
  console.log("Refreshing CJ access token...");

  const res = await fetch(`${config.cjBaseUrl}/v1/authentication/refreshAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  const json: CJApiResponse<CJAuthToken> = await res.json();
  if (!json.result || json.code !== 200 || !json.data) {
    console.warn("Refresh failed, fetching fresh token instead");
    return await fetchNewToken();
  }

  console.log("CJ access token refreshed");
  return json.data;
}

async function saveToken(data: CJAuthToken): Promise<void> {
  const col = getDB().collection<TokenDocument>(TOKEN_COLLECTION);
  const doc: TokenDocument = {
    accessToken: data.accessToken,
    accessTokenExpiryDate: new Date(data.accessTokenExpiryDate),
    refreshToken: data.refreshToken,
    refreshTokenExpiryDate: new Date(data.refreshTokenExpiryDate),
    openId: data.openId ?? 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  // Always upsert - only one token doc needed
  await col.updateOne({}, { $set: doc }, { upsert: true });
}

// Public: get a valid access token
export async function getAccessToken(): Promise<string> {
  const col = getDB().collection<TokenDocument>(TOKEN_COLLECTION);
  const stored = await col.findOne({});

  if (stored) {
    const now = Date.now();
    const accessExpiry = new Date(stored.accessTokenExpiryDate).getTime();
    const refreshExpiry = new Date(stored.refreshTokenExpiryDate).getTime();

    if (accessExpiry - now > BUFFER_MS) {
      return stored.accessToken; // Still valid
    }

    if (refreshExpiry - now > BUFFER_MS) {
      const fresh = await refreshToken(stored.refreshToken);
      await saveToken(fresh);
      return fresh.accessToken;
    }
  }

  // No token or fully expired
  const fresh = await fetchNewToken();
  await saveToken(fresh);
  return fresh.accessToken;
}

// Public: authenticated CJ API fetch
export async function cjFetch<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
): Promise<CJApiResponse<T>> {
  const token = await getAccessToken();
  const url = endpoint.startsWith("http") ? endpoint : `${config.cjBaseUrl}${endpoint}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "CJ-Access-Token": token,
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    throw new Error(`CJ HTTP ${res.status} on ${endpoint}`);
  }

  const json: CJApiResponse<T> = await res.json();

  if (json.code !== 200) {
    throw new Error(`CJ API error: ${json.message} (code ${json.code})`);
  }

  return json;
}
