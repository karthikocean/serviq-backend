import { Router } from "express";
import { login, getProfile, logout } from "../controllers/admin/auth.controller";
import { getDashboard } from "../controllers/admin/dashboard.controller";
import { protect } from "../middleware/authMiddleware";

const router = Router();

// Auth
router.post("/login", login);
router.post("/logout", protect, logout);
router.get("/profile", protect, getProfile);

// Dashboard
router.get("/dashboard", protect, getDashboard);

export default router;
