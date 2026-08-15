import dns from "dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);
dns.setDefaultResultOrder("ipv4first");
import express, { Application, Request, Response } from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import fileUpload from "express-fileupload";
import path from "path";
import swaggerUi from "swagger-ui-express";
import swaggerJsDoc from "swagger-jsdoc";

import connectDB from "./Config/db";
import adminRoute from "./routes/admin.route";
import superAdminRoute from "./routes/super-admin.route";
import mobileRoute from "./routes/mobile.route";
import websiteRoute from "./routes/website.route";
import uploadRoute from "./routes/upload.route";
import { errorHandler, notFound } from "./middleware/errorMiddleware";
import { seedAdmin } from "./utils/adminSeed";
import { seedModules } from "./utils/moduleSeed";
// roleSeed was removed because Super Admin role is seeded inside adminSeed.ts now
import { seedOrders } from "./utils/orderSeed";
import { seedPlans } from "./utils/planSeed";
import { startCronJobs } from "./utils/cronJobs";

dotenv.config({ quiet: true } as any);

const app: Application = express();
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    await seedModules();
    // await seedPlans();
    await seedAdmin();
    // await seedOrders();

    // Start background cron jobs
    startCronJobs();

    app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
    app.use(cors());
    app.use(morgan("dev"));
    app.use(express.json({ limit: '50mb' }));
    app.use(fileUpload());

    app.use("/public", express.static(path.join(process.cwd(), "public")));
    app.use("/uploads", express.static(path.join(process.cwd(), "public", "uploads")));

    // Swagger Options
    const swaggerOptions = {
      definition: {
        openapi: "3.0.0",
        info: {
          title: "ServiQ Restaurant API",
          version: "1.0.0",
          description: "API Documentation for ServiQ backend",
        },
        servers: [
          { url: "http://localhost:5000" },
          { url: "http://192.168.1.17:5000", description: "Network" }],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: "http",
              scheme: "bearer",
              bearerFormat: "JWT",
            },
          },
          responses: {
            400: {
              description: "Bad Request or Validation Error",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean", example: false },
                      message: { type: "string", example: "Validation Error or Bad Request" }
                    }
                  }
                }
              }
            },
            401: {
              description: "Unauthorized",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean", example: false },
                      message: { type: "string", example: "Not authorized, token failed" }
                    }
                  }
                }
              }
            },
            404: {
              description: "Not Found",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean", example: false },
                      message: { type: "string", example: "Resource not found" }
                    }
                  }
                }
              }
            },
            500: {
              description: "Internal Server Error",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean", example: false },
                      message: { type: "string", example: "Server Error" }
                    }
                  }
                }
              }
            }
          }
        },
        security: [{ bearerAuth: [] }],
      },
      apis: ["./src/routes/**/*.ts", "./src/routes/*.ts"],
    };

    const swaggerDocs = swaggerJsDoc(swaggerOptions);
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

    // Health check
    app.get("/", (req: Request, res: Response) => {
      const dbState = ["disconnected", "connected", "connecting", "disconnecting"];
      const memoryUsage = process.memoryUsage();
      res.status(200).json({
        status: "OK",
        app: "Serviq Backend",
        timestamp: new Date().toISOString(),
        uptime: `${Math.floor(process.uptime())}s`,
        environment: process.env.NODE_ENV || "development",
        node_version: process.version,
        database: {
          status: dbState[mongoose.connection.readyState] ?? "unknown",
          name: mongoose.connection.name || null,
        },
        memory: {
          heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
          heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
          rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`,
        },
      });
    });

    // ─── Routes ──────────────────────────────────────────
    app.use("/api/admin", adminRoute);
    app.use("/api/super-admin", superAdminRoute);
    app.use("/api/mobile", mobileRoute);
    app.use("/api/website", websiteRoute);
    app.use("/api/upload", uploadRoute);

    // ─── Error Handlers ───────────────────────────────────
    app.use(notFound);
    app.use(errorHandler);

    app.listen(PORT, () => {
      console.log(`🚀 Serviq server running on port ${PORT}`);
      console.log(`   Admin       → /api/admin`);
      console.log(`   Super Admin → /api/super-admin`);
      console.log(`   Mobile      → /api/mobile`);
      console.log(`   Website     → /api/website`);
      console.log(`   Upload      → /api/upload`);
    });
  } catch (error) {
    console.error("Startup error ❌:", error);
  }
};

startServer();

export default app;
