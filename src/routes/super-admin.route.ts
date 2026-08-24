import { Router } from "express";
import authRoutes from "./super-admin/auth.route";
import managerRoutes from "./super-admin/manager.route";
import roleRoutes from "./super-admin/role.route";
import planRoutes from "./super-admin/plan.route";
import restaurantRoutes from "./super-admin/restaurant.route";
import subscriptionRoutes from "./super-admin/subscription.route";
import addonRoutes from "./super-admin/addon.route";
import couponRoutes from "./super-admin/coupon.route";
import leadRoutes from "./super-admin/lead.route";
import ticketRoutes from "./super-admin/ticket.route";
import notificationRoutes from "./super-admin/system-notification.route";
import settingRoutes from "./super-admin/setting.route";
import { protectSuperAdmin } from "../middleware/authMiddleware";

const router = Router();

router.use("/auth", authRoutes);
router.use("/managers", protectSuperAdmin, managerRoutes);
router.use("/roles", protectSuperAdmin, roleRoutes);
router.use("/plans", protectSuperAdmin, planRoutes);
router.use("/restaurants", protectSuperAdmin, restaurantRoutes);
router.use("/subscriptions", protectSuperAdmin, subscriptionRoutes);
router.use("/addons", protectSuperAdmin, addonRoutes);
router.use("/coupons", protectSuperAdmin, couponRoutes);
router.use("/leads", protectSuperAdmin, leadRoutes);
router.use("/tickets", protectSuperAdmin, ticketRoutes);
router.use("/notifications", protectSuperAdmin, notificationRoutes);
router.use("/settings", protectSuperAdmin, settingRoutes);

export default router;