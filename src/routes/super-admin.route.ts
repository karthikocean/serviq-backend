import { Router } from "express";
import { superAdminLogin, getSuperAdminProfile, logout } from "../controllers/super-admin/auth.controller";
import { getAllManagers, createManager, updateManager, deleteManager } from "../controllers/super-admin/managers.controller";
import { getAllRoles, createRole, updateRole, deleteRole, getAllModules } from "../controllers/super-admin/roles.controller";
import { getAllPlans, createPlan, updatePlan, deletePlan } from "../controllers/super-admin/plan.controller";
import { getAllRestaurants, createRestaurant, updateRestaurant, deleteRestaurant } from "../controllers/super-admin/restaurant.controller";
import { getAllSubscriptions, assignSubscription, updateSubscription, deleteSubscription } from "../controllers/super-admin/subscription.controller";
import { protect } from "../middleware/authMiddleware";

const router = Router();

// ─── Auth ───────────────────────────────────────────
router.post("/login", superAdminLogin);
router.post("/logout", protect, logout);
router.get("/profile", protect, getSuperAdminProfile);

// ─── Managers ───────────────────────────────────────
router.get("/managers", protect, getAllManagers);
router.post("/managers", protect, createManager);
router.put("/managers/:id", protect, updateManager);
router.delete("/managers/:id", protect, deleteManager);

// ─── Roles & Modules ────────────────────────────────
router.get("/modules", protect, getAllModules);
router.get("/roles", protect, getAllRoles);
router.post("/roles", protect, createRole);
router.put("/roles/:id", protect, updateRole);
router.delete("/roles/:id", protect, deleteRole);

// ─── Plans ──────────────────────────────────────────
router.get("/plans", protect, getAllPlans);
router.post("/plans", protect, createPlan);
router.put("/plans/:id", protect, updatePlan);
router.delete("/plans/:id", protect, deletePlan);

// ─── Restaurants ────────────────────────────────────────
router.get("/restaurants", protect, getAllRestaurants);
router.post("/restaurants", protect, createRestaurant);
router.put("/restaurants/:id", protect, updateRestaurant);
router.delete("/restaurants/:id", protect, deleteRestaurant);

// ─── Subscriptions ───────────────────────────────────
router.get("/subscriptions", protect, getAllSubscriptions);
router.post("/subscriptions", protect, assignSubscription);
router.put("/subscriptions/:id", protect, updateSubscription);
router.delete("/subscriptions/:id", protect, deleteSubscription);

export default router;