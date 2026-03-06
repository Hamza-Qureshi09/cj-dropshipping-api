import { cjFetch } from "./cjAuth.service.ts";
import type { CJShippingQuery, CJShippingRate } from "../types/index.ts";

export async function getShippingRates(query: CJShippingQuery): Promise<CJShippingRate[]> {
  const res = await cjFetch<CJShippingRate[]>("/v1/logistic/freightCalculate", {
    method: "POST",
    body: JSON.stringify({
      pid: query.pid,
      vid: query.vid,
      quantity: query.quantity,
      countryCode: query.countryCode,
    }),
  });
  return res.data ?? [];
}

export async function getShippingMethods(countryCode: string): Promise<unknown> {
  const res = await cjFetch(
    `/v1/logistic/getLogisticInfo?countryCode=${countryCode}`,
  );
  return res.data;
}
