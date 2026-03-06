import type { HttpMethod, Route, RouteHandler } from "../types/index.ts";
import { error, notFound } from "./response.ts";

export class Router {
  private routes: Route[] = [];
  private prefix: string;

  constructor(prefix = "") {
    this.prefix = prefix;
  }

  private add(method: HttpMethod, path: string, handler: RouteHandler): this {
    const fullPath = `${this.prefix}${path}`;
    // URLPattern expects a full URL pattern - use wildcard origin
    this.routes.push({
      method,
      pattern: new URLPattern({ pathname: fullPath }),
      handler,
    });
    return this;
  }

  get(path: string, handler: RouteHandler): this {
    return this.add("GET", path, handler);
  }

  post(path: string, handler: RouteHandler): this {
    return this.add("POST", path, handler);
  }

  put(path: string, handler: RouteHandler): this {
    return this.add("PUT", path, handler);
  }

  delete(path: string, handler: RouteHandler): this {
    return this.add("DELETE", path, handler);
  }

  patch(path: string, handler: RouteHandler): this {
    return this.add("PATCH", path, handler);
  }

  getRoutes(): Route[] {
    return this.routes;
  }
}

// App - combines routers + global middleware
export class App {
  private routes: Route[] = [];

  use(router: Router): this {
    this.routes.push(...router.getRoutes());
    return this;
  }

  /** Main fetch handler - pass to Deno.serve */
  handler = async (req: Request): Promise<Response> => {
    const url = new URL(req.url);
    const method = req.method as HttpMethod;

    // CORS preflight
    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(req) });
    }

    const start = Date.now();

    let response: Response;

    try {
      const matched = this.match(method, url);

      if (!matched) {
        response = notFound(`Route not found: ${method} ${url.pathname}`);
      } else {
        response = await matched.handler(req, matched.params);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[ERROR] ${method} ${url.pathname} - ${message}`);
      response = error(message, 500);
    }

    // Attach CORS headers to every response
    const final = attachCors(response, req);

    // Log
    const ms = Date.now() - start;
    const emoji = final.status >= 500 ? "🔴" : final.status >= 400 ? "🟡" : "🟢";
    console.log(
      `${emoji} ${method} ${url.pathname} → ${final.status} (${ms}ms)`,
    );

    return final;
  };

  private match(
    method: HttpMethod,
    url: URL,
  ): { handler: RouteHandler; params: Record<string, string> } | null {
    for (const route of this.routes) {
      if (route.method !== method) continue;
      const match = route.pattern.exec(url);
      if (match) {
        const params = (match.pathname.groups ?? {}) as Record<string, string>;
        return { handler: route.handler, params };
      }
    }
    return null;
  }
}

// CORS Helpers
function corsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get("origin") ?? "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

function attachCors(response: Response, req: Request): Response {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(corsHeaders(req))) {
    headers.set(k, v);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
