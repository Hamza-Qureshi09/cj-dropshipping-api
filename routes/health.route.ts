import { Router } from "../utils/router.ts";
import { error, ok } from "../utils/response.ts";
import { getDB } from "../utils/database.ts";
import { getAccessToken } from "../services/cjAuth.service.ts";

export const healthRouter = new Router("/api");

healthRouter.get("/health", async (_req, _params) => {
  let dbStatus = "disconnected";
  let cjStatus = "unknown";

  try {
    await getDB().command({ ping: 1 });
    dbStatus = "connected";
  } catch {
    dbStatus = "error";
  }

  try {
    const token = await getAccessToken();
    cjStatus = token ? "authenticated" : "error";
  } catch {
    cjStatus = "error";
  }

  const healthy = dbStatus === "connected" && cjStatus === "authenticated";

  const body = {
    status: healthy ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    services: { database: dbStatus, cjDropshipping: cjStatus },
    msg:"hi! from hq"
  };

  return new Response(JSON.stringify(body), {
    status: healthy ? 200 : 503,
    headers: { "Content-Type": "application/json" },
  });
});

// inspect stored token metadata
healthRouter.get("/auth/token-info", async (_req, _params) => {
  if (Deno.env.get("NODE_ENV") !== "development") {
    return error("Only available in development", 403);
  }

  const col = getDB().collection("cj_tokens");
  const doc = await col.findOne(
    {},
    { projection: { accessToken: 0, refreshToken: 0 } }, // never expose tokens
  );

  return ok(doc ?? { message: "No token stored yet" });
});
