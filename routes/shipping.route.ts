import { Router } from "../utils/router.ts";
import { ok, badRequest, parseBody } from "../utils/response.ts";
import { getShippingRates, getShippingMethods } from "../services/shipping.service.ts";
import type { CJShippingQuery } from "../types/index.ts";

export const shippingRouter = new Router("/api/shipping");

// POST /api/shipping/rates
shippingRouter.post("/rates", async (req, _params) => {
  const body = await parseBody<CJShippingQuery>(req);

  if (!body.pid) return badRequest("pid is required");
  if (!body.vid) return badRequest("vid is required");
  if (!body.countryCode) return badRequest("countryCode is required");
  if (!body.quantity) return badRequest("quantity is required");

  const rates = await getShippingRates(body);
  return ok(rates);
});

// GET /api/shipping/methods/:countryCode
shippingRouter.get("/methods/:countryCode", async (_req, params) => {
  const data = await getShippingMethods(params.countryCode.toUpperCase());
  return ok(data);
});