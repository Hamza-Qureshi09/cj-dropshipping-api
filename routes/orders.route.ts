import { Router } from "../utils/router.ts";
import {
  badRequest,
  created,
  getSearchParams,
  notFound,
  ok,
  paginated,
  parseBody,
} from "../utils/response.ts";
import {
  confirmPayment,
  createOrder,
  getOrder,
  getTracking,
  listOrders,
  syncOrderStatus,
} from "../services/orders.service.ts";
import type { CJCreateOrderPayload, OrderStatus } from "../types/index.ts";

export const orderRouter = new Router("/api/orders");

// POST /api/orders
orderRouter.post("/", async (req, _params) => {
  const body = await parseBody<CJCreateOrderPayload>(req);

  if (!body.orderNumber) return badRequest("orderNumber is required");
  if (!body.shippingCountry) return badRequest("shippingCountry is required");
  if (!body.shippingAddress) return badRequest("shippingAddress is required");
  if (!body.products?.length) return badRequest("products array is required");

  const order = await createOrder(body);
  return created(order);
});

// GET /api/orders
orderRouter.get("/", async (req, _params) => {
  const p = getSearchParams(req);
  const page = Number(p.get("page") ?? 1);
  const limit = Math.min(Number(p.get("limit") ?? 20), 100);
  const status = p.get("status") as OrderStatus ?? undefined;

  const { orders, total } = await listOrders(page, limit, status);
  return paginated(orders, total, page, limit);
});

// GET /api/orders/:storeOrderId
orderRouter.get("/:storeOrderId", async (_req, params) => {
  const order = await getOrder(params.storeOrderId);
  if (!order) return notFound(`Order ${params.storeOrderId} not found`);
  return ok(order);
});

// GET /api/orders/:cjOrderId/status  — syncs from CJ then returns
orderRouter.get("/:cjOrderId/status", async (_req, params) => {
  const data = await syncOrderStatus(params.cjOrderId);
  if (!data) return notFound(`CJ order ${params.cjOrderId} not found`);
  return ok(data);
});

// GET /api/orders/:cjOrderId/tracking
orderRouter.get("/:cjOrderId/tracking", async (_req, params) => {
  const data = await getTracking(params.cjOrderId);
  return ok(data);
});

// POST /api/orders/:cjOrderId/confirm
orderRouter.post("/:cjOrderId/confirm", async (_req, params) => {
  const confirmed = await confirmPayment(params.cjOrderId);
  return ok({
    confirmed,
    message: confirmed ? "Payment confirmed with CJ" : "Confirmation failed",
  });
});
