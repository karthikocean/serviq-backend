import { Router } from "express";
import authRoutes from "./auth.route";
import profileRoutes from "./profile.route";
import menuRoutes from "./menu.route";
import orderRoutes from "./order.route";
import notificationRoutes from "./notification.route";
import analyticsRoutes from "./analytics.route";
import { protectMobile } from "../../../middleware/authMiddleware";

const router = Router();

router.use("/auth", authRoutes);

// Protect all following routes
router.use(protectMobile);

router.use("/profile", profileRoutes);
router.use("/menu", menuRoutes);
router.use("/orders", orderRoutes);
router.use("/notifications", notificationRoutes);
router.use("/analytics", analyticsRoutes);

export default router;
