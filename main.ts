import { config } from "./config/config.ts";
import { closeDB, connectDB } from "./utils/database.ts";
import { App } from "./utils/router.ts";

// Routes
import { healthRouter } from "./routes/health.route.ts";
import { productRouter } from "./routes/products.route.ts";
import { orderRouter } from "./routes/orders.route.ts";
import { shippingRouter } from "./routes/shipping.route.ts";

// Bootstrap

await connectDB();

const app = new App();
app.use(healthRouter);
app.use(productRouter);
app.use(orderRouter);
app.use(shippingRouter);

const ac = new AbortController();

const server = Deno.serve({
  port: config.port,
  hostname: config.host,
  handler: app.handler,
  signal: ac.signal,
  onListen({ port, hostname }) {
    console.log(`
 http://${hostname}:${port}                      
 Env:  ${config.nodeEnv.padEnd(34)}
 DB:   ${config.mongoDbName.padEnd(34)}

  Routes:
  GET  /api/health
  GET  /api/products/search
  GET  /api/products/categories
  GET  /api/products/:pid
  GET  /api/products/:pid/variants
  POST /api/orders
  GET  /api/orders
  GET  /api/orders/:id/status
  GET  /api/orders/:id/tracking
  POST /api/orders/:id/confirm
  POST /api/shipping/rates
  GET  /api/shipping/methods/:countryCode
    `);
  },
});

// Graceful shutdown
const shutdown = async () => {
  console.log("\n Shutting down...");
  ac.abort();
  await closeDB();
};

Deno.addSignalListener("SIGINT", shutdown);
if (Deno.build.os !== "windows") {
  Deno.addSignalListener("SIGTERM", shutdown);
}

await server.finished;
console.log("Server closed");
