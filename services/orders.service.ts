import { cjFetch } from "./cjAuth.service.ts";
import { getDB } from "../utils/database.ts";
import type { CJCreateOrderPayload, CJOrder, OrderDocument, OrderStatus } from "../types/index.ts";

const COL = "orders";

export async function createOrder(payload: CJCreateOrderPayload): Promise<OrderDocument> {
  const col = getDB().collection<OrderDocument>(COL);

  // Idempotency - don't double-submit
  const existing = await col.findOne({ storeOrderId: payload.orderNumber });
  if (existing?.cjOrderId) {
    console.warn(`Order ${payload.orderNumber} already submitted`);
    return existing;
  }

  const orderDoc: OrderDocument = {
    storeOrderId: payload.orderNumber,
    status: "pending",
    customerInfo: payload.shippingAddress,
    products: payload.products,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  console.log(`Submitting order ${payload.orderNumber} to CJ...`);

  const res = await cjFetch<{ orderId: string }>("/v1/shopping/order/createOrder", {
    method: "POST",
    body: JSON.stringify({
      orderNumber: payload.orderNumber,
      shippingCountry: payload.shippingCountry,
      shippingAddress: payload.shippingAddress,
      products: payload.products,
      remark: payload.remark ?? "",
    }),
  });

  orderDoc.cjOrderId = res.data?.orderId;
  orderDoc.status = "submitted";
  orderDoc.rawCJResponse = res.data;

  await col.updateOne(
    { storeOrderId: payload.orderNumber },
    { $set: orderDoc },
    { upsert: true },
  );

  console.log(`✅ Order ${payload.orderNumber} → CJ ID: ${orderDoc.cjOrderId}`);
  return orderDoc;
}

export async function syncOrderStatus(cjOrderId: string): Promise<CJOrder | null> {
  const res = await cjFetch<CJOrder>(
    `/v1/shopping/order/getOrderDetail?orderId=${cjOrderId}`,
  );
  if (!res.data) return null;

  const col = getDB().collection<OrderDocument>(COL);
  await col.updateOne(
    { cjOrderId },
    {
      $set: {
        status: mapStatus(res.data.status),
        trackingNumbers: res.data.logisticList?.map((l) => l.trackNumber) ?? [],
        updatedAt: new Date(),
        rawCJResponse: res.data,
      },
    },
  );

  return res.data;
}

export async function listOrders(
  page = 1,
  limit = 20,
  status?: OrderStatus,
): Promise<{ orders: OrderDocument[]; total: number }> {
  const col = getDB().collection<OrderDocument>(COL);
  const filter = status ? { status } : {};
  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    col.find(filter).skip(skip).limit(limit).sort({
      createdAt: -1,
    }).toArray(),
    col.countDocuments(filter),
  ]);

  return { orders, total };
}

export async function getOrder(storeOrderId: string): Promise<OrderDocument | null> {
  return await getDB().collection<OrderDocument>(COL).findOne({ storeOrderId });
}

export async function getTracking(cjOrderId: string): Promise<unknown> {
  const res = await cjFetch(`/v1/logistic/queryTrackingInfo?orderId=${cjOrderId}`);
  return res.data;
}

export async function confirmPayment(cjOrderId: string): Promise<boolean> {
  const res = await cjFetch("/v1/shopping/order/confirmOrder", {
    method: "POST",
    body: JSON.stringify({ orderId: cjOrderId }),
  });

  if (res.result) {
    await getDB()
      .collection<OrderDocument>(COL)
      .updateOne(
        { cjOrderId },
        { $set: { status: "processing", updatedAt: new Date() } },
      );
  }

  return res.result;
}

function mapStatus(cjStatus: string): OrderDocument["status"] {
  const map: Record<string, OrderDocument["status"]> = {
    CREATED: "submitted",
    IN_QUEUE: "submitted",
    PROCESSING: "processing",
    SHIPPED: "shipped",
    DELIVERED: "delivered",
    CANCELLED: "cancelled",
  };
  return map[cjStatus?.toUpperCase()] ?? "processing";
}
