import { cjFetch } from "./cjAuth.service.ts";
import { getDB } from "../utils/database.ts";
import type {
  CachedProductDocument,
  CJProduct,
  CJProductListData,
  CJProductSearchParams,
  CJProductVariant,
} from "../types/index.ts";

const CACHE_COLLECTION = "product_cache";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function searchProducts(params: CJProductSearchParams): Promise<CJProductListData> {
  const q = new URLSearchParams();
  if (params.productName) q.set("productName", params.productName);
  if (params.categoryId) q.set("categoryId", params.categoryId);
  if (params.minPrice !== undefined) q.set("minPrice", String(params.minPrice));
  if (params.maxPrice !== undefined) q.set("maxPrice", String(params.maxPrice));
  q.set("pageNum", String(params.pageNum ?? 1));
  q.set("pageSize", String(params.pageSize ?? 20));
  if (params.orderBy) q.set("orderBy", params.orderBy);
  if (params.categoryKeyword) q.set("categoryKeyword", params.categoryKeyword);

  const res = await cjFetch<CJProductListData>(`/v1/product/list?${q.toString()}`);
  return res.data ?? { total: 0, pageNum: 1, pageSize: 20, list: [] };
}

export async function getProductById(pid: string): Promise<CJProduct | null> {
  const cached = await getCached(pid);
  if (cached) {
    console.log(`Cache hit → product ${pid}`);
    return cached;
  }

  console.log(`Fetching product ${pid} from CJ`);
  const res = await cjFetch<CJProduct>(`/v1/product/query?pid=${pid}`);
  if (!res.data) return null;

  await setCache(pid, res.data);
  return res.data;
}

export async function getProductVariants(pid: string): Promise<CJProductVariant[]> {
  const res = await cjFetch<{ variants: CJProductVariant[] }>(
    `/v1/product/variant/query?pid=${pid}`,
  );
  return res.data?.variants ?? [];
}

export async function getCategories(parentId?: string): Promise<unknown> {
  const url = parentId ? `/v1/product/getCategory?parentId=${parentId}` : `/v1/product/getCategory`;
  const res = await cjFetch(url);
  return res.data;
}

export async function clearProductCache(pid?: string): Promise<void> {
  const col = getDB().collection(CACHE_COLLECTION);
  if (pid) {
    await col.deleteOne({ pid });
  } else {
    await col.deleteMany({});
  }
}

// Cache helpers 
async function getCached(pid: string): Promise<CJProduct | null> {
  try {
    const col = getDB().collection<CachedProductDocument>(CACHE_COLLECTION);
    const doc = await col.findOne({ pid });
    if (!doc) return null;
    if (new Date(doc.expiresAt) < new Date()) {
      await col.deleteOne({ pid });
      return null;
    }
    return doc.productData;
  } catch {
    return null;
  }
}

async function setCache(pid: string, product: CJProduct): Promise<void> {
  try {
    const col = getDB().collection<CachedProductDocument>(CACHE_COLLECTION);
    const now = new Date();
    await col.updateOne(
      { pid },
      {
        $set: {
          pid,
          productData: product,
          cachedAt: now,
          expiresAt: new Date(now.getTime() + CACHE_TTL_MS),
        },
      },
      { upsert: true },
    );
  } catch (err) {
    console.warn(`Cache write failed for ${pid}: ${err}`);
  }
}
