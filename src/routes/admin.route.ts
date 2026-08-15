import { Router } from "express";
import authRoutes from "./admin/auth.route";
import dashboardRoutes from "./admin/dashboard.route";
import tableRoutes from "./admin/table.route";
import qrRoutes from "./admin/qr.route";
import orderRoutes from "./admin/order.route";
import menuRoutes from "./admin/menu.route";
import { protectAdmin } from "../middleware/authMiddleware";

const router = Router();

router.use("/", authRoutes);
router.use("/dashboard", protectAdmin, dashboardRoutes);
router.use("/table", protectAdmin, tableRoutes);
router.use("/qr", protectAdmin, qrRoutes);
router.use("/orders", protectAdmin, orderRoutes);
router.use("/billing", protectAdmin, orderRoutes);
router.use("/menu", protectAdmin, menuRoutes);

export default router;
