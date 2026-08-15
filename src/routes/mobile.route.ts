import { Router } from "express";
import authRoutes from "./mobile/auth.route";
import profileRoutes from "./mobile/profile.route";

const router = Router();

router.use("/", authRoutes);
router.use("/profile", profileRoutes);

export default router;
