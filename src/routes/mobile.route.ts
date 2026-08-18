import { Router } from "express";
import waiterRoutes from "./mobile/waiter/index.route";
import kitchenRoutes from "./mobile/kitchen/index.route";

const router = Router();

router.use("/waiter", waiterRoutes);
router.use("/kitchen", kitchenRoutes);

export default router;
// Triggering IDE TS Server reload
