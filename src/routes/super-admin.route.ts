import { Router } from "express";
import authRoutes from "./super-admin/auth.route";
import managerRoutes from "./super-admin/manager.route";
import roleRoutes from "./super-admin/role.route";
import planRoutes from "./super-admin/plan.route";
import restaurantRoutes from "./super-admin/restaurant.route";
import subscriptionRoutes from "./super-admin/subscription.route";
import { protectSuperAdmin } from "../middleware/authMiddleware";

const router = Router();

router.use("/auth", authRoutes);
router.use("/managers", protectSuperAdmin, managerRoutes);
router.use("/roles", protectSuperAdmin, roleRoutes);
router.use("/plans", protectSuperAdmin, planRoutes);
router.use("/restaurants", protectSuperAdmin, restaurantRoutes);
router.use("/subscriptions", protectSuperAdmin, subscriptionRoutes);

export default router;