import { Router } from "express";
import authRoutes from "./auth.route";
import profileRoutes from "./profile.route";
import menuRoutes from "./menu.route";
import tableRoutes from "./table.route";
import orderRoutes from "./order.route";
import dashboardRoutes from "./dashboard.route";
import notificationRoutes from "./notification.route";
import { protectMobile } from "../../../middleware/authMiddleware";

const router = Router();

router.use("/auth", authRoutes);

// Protect all following routes
router.use(protectMobile);

router.use("/profile", profileRoutes);
router.use("/menu", menuRoutes);
router.use("/tables", tableRoutes);
router.use("/orders", orderRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/notifications", notificationRoutes);

export default router;
