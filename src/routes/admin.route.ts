import { Router } from "express";
import authRoutes from "./admin/auth.route";
import dashboardRoutes from "./admin/dashboard.route";
import tableRoutes from "./admin/table.route";
import orderRoutes from "./admin/order.route";
import billingRoutes from "./admin/billing.route";
import kdsRoutes from "./admin/kds.route";
import menuRoutes from "./admin/menu.route";
import branchRoutes from "./admin/branch.route";
import settingsRoutes from "./admin/settings.route";
import userRoutes from "./admin/user.route";
import roleRoutes from "./admin/role.route";
import staffRoutes from "./admin/staff.route";
import uploadRoutes from "./upload.route";
import ticketRoutes from "./admin/ticket.route";
import { protectAdmin } from "../middleware/authMiddleware";

const router = Router();

router.use("/", authRoutes);
router.use("/dashboard", protectAdmin, dashboardRoutes);
router.use("/tables", protectAdmin, tableRoutes);
router.use("/orders", protectAdmin, orderRoutes);
router.use("/billing", protectAdmin, billingRoutes);
router.use("/kds", protectAdmin, kdsRoutes);
router.use("/menu", protectAdmin, menuRoutes);
router.use("/branches", protectAdmin, branchRoutes);
router.use("/settings", protectAdmin, settingsRoutes);
router.use("/users", protectAdmin, userRoutes);
router.use("/roles-permissions", protectAdmin, roleRoutes);
router.use("/staff", protectAdmin, staffRoutes);
router.use("/upload", protectAdmin, uploadRoutes);
router.use("/tickets", protectAdmin, ticketRoutes);

export default router;
