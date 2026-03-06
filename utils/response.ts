// Native Response Helpers

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function ok(data: unknown, status = 200): Response {
  return json({ success: true, data }, status);
}

export function created(data: unknown): Response {
  return ok(data, 201);
}

export function error(message: string, status = 500, extra?: Record<string, unknown>): Response {
  return json({ success: false, error: message, ...extra }, status);
}

export function badRequest(message: string): Response {
  return error(message, 400);
}

export function notFound(message = "Not found"): Response {
  return error(message, 404);
}

export function paginated(
  data: unknown[],
  total: number,
  page: number,
  limit: number,
): Response {
  return json({
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}

// Request Helpers

export async function parseBody<T = unknown>(req: Request): Promise<T> {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error("Content-Type must be application/json");
  }
  return await req.json() as T;
}

export function getSearchParams(req: Request): URLSearchParams {
  return new URL(req.url).searchParams;
}
