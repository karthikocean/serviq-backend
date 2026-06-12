import { Router } from "express";
import { register, login, getProfile, updateProfile, logout } from "../controllers/mobile/auth.controller";
import { protect } from "../middleware/authMiddleware";

const router = Router();

// ─── Auth ────────────────────────────────────────────
router.post("/register", register);
router.post("/login", login);
router.post("/logout", protect, logout);

// ─── Profile ─────────────────────────────────────────
router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfile);

export default router;
