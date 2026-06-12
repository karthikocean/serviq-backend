import { Router } from "express";
import { superAdminLogin, getSuperAdminProfile, logout } from "../controllers/super-admin/auth.controller";
import { getAllManagers, createManager, updateManager, deleteManager } from "../controllers/super-admin/managers.controller";
import { getAllRoles, createRole, updateRole, deleteRole, getAllModules } from "../controllers/super-admin/roles.controller";
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

export default router;
