import { Router } from "express";
import { login, getProfile } from "../controllers/admin/auth.controller";
import { protect } from "../middleware/authMiddleware";

const router = Router();

router.post("/login", login);
router.get("/profile", protect, getProfile);

export default router;
