import { Router } from "express";
import { createAddon, getAllAddons, updateAddon, deleteAddon } from "../../controllers/super-admin/addon.controller";

const router = Router();

router.post("/", createAddon);
router.get("/", getAllAddons);
router.put("/:id", updateAddon);
router.delete("/:id", deleteAddon);

export default router;
