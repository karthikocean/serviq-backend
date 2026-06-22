import express, { Application, Request, Response } from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import fileUpload from "express-fileupload";
import path from "path";

import connectDB from "./Config/db";
import adminRoute from "./routes/admin.route";
import superAdminRoute from "./routes/super-admin.route";
import mobileRoute from "./routes/mobile.route";
import websiteRoute from "./routes/website.route";
import { errorHandler, notFound } from "./middleware/errorMiddleware";
import { seedAdmin } from "./utils/adminSeed";
import { seedModules } from "./utils/moduleSeed";
import { seedRoles } from "./utils/roleSeed";
import { seedOrders } from "./utils/orderSeed";

dotenv.config({ quiet: true } as any);

const app: Application = express();
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    await seedModules();
    await seedRoles();
    await seedAdmin();
    await seedOrders();

    app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
    app.use(cors());
    app.use(morgan("dev"));
    app.use(express.json());
    app.use(fileUpload());

    app.use("/public", express.static(path.join(process.cwd(), "public")));
    app.use("/uploads", express.static(path.join(process.cwd(), "public", "uploads")));

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

    // ─── Error Handlers ───────────────────────────────────
    app.use(notFound);
    app.use(errorHandler);

    app.listen(PORT, () => {
      console.log(`🚀 Serviq server running on port ${PORT}`);
      console.log(`   Admin       → /api/admin`);
      console.log(`   Super Admin → /api/super-admin`);
      console.log(`   Mobile      → /api/mobile`);
      console.log(`   Website     → /api/website`);
    });
  } catch (error) {
    console.error("Startup error ❌:", error);
  }
};

startServer();

export default app;
