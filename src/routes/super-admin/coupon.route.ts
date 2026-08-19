import { Router } from "express";
import {
    createCoupon,
    getCoupons,
    getCouponById,
    updateCoupon,
    deleteCoupon
} from "../../controllers/super-admin/coupon.controller";

const router = Router();

router.post("/", createCoupon);
router.get("/", getCoupons);
router.get("/:id", getCouponById);
router.put("/:id", updateCoupon);
router.delete("/:id", deleteCoupon);

export default router;
