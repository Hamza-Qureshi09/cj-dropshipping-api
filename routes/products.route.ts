import { Router } from "../utils/router.ts";
import { getSearchParams, notFound, ok } from "../utils/response.ts";
import {
  clearProductCache,
  getCategories,
  getProductById,
  getProductVariants,
  searchProducts,
} from "../services/products.service.ts";

export const productRouter = new Router("/api/products");

// GET /api/products/search
productRouter.get("/search", async (req, _params) => {
  const p = getSearchParams(req);
  const result = await searchProducts({
    productName: p.get("productName") ?? undefined,
    categoryId: p.get("categoryId") ?? undefined,
    minPrice: p.has("minPrice") ? Number(p.get("minPrice")) : undefined,
    maxPrice: p.has("maxPrice") ? Number(p.get("maxPrice")) : undefined,
    pageNum: Number(p.get("pageNum") ?? 1),
    pageSize: Number(p.get("pageSize") ?? 20),
    orderBy: p.get("orderBy") ?? undefined,
    categoryKeyword: p.get("categoryKeyword") ?? undefined,
  });
  return ok(result);
});

// GET /api/products/categories
productRouter.get("/categories", async (req, _params) => {
  const parentId = getSearchParams(req).get("parentId") ?? undefined;
  const data = await getCategories(parentId);
  return ok(data);
});

// DELETE /api/products/cache/all
productRouter.delete("/cache/all", async (_req, _params) => {
  await clearProductCache();
  return ok({ message: "All product cache cleared" });
});

// DELETE /api/products/cache/:pid
productRouter.delete("/cache/:pid", async (_req, params) => {
  await clearProductCache(params.pid);
  return ok({ message: `Cache cleared for product ${params.pid}` });
});

// GET /api/products/:pid/variants
productRouter.get("/:pid/variants", async (_req, params) => {
  const variants = await getProductVariants(params.pid);
  return ok(variants);
});

// GET /api/products/:pid
productRouter.get("/:pid", async (_req, params) => {
  const product = await getProductById(params.pid);
  if (!product) return notFound(`Product ${params.pid} not found`);
  return ok(product);
});
