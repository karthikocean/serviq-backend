import { Router } from "express";
import { getWaiterReports, getKitchenReports } from "../../controllers/admin/reports.controller";

const router = Router();

// @route   GET /api/admin/reports/waiter
// @desc    Get Waiter performance reports
// @access  Private
router.get("/waiter", getWaiterReports);

// @route   GET /api/admin/reports/kitchen
// @desc    Get Kitchen performance reports
// @access  Private
router.get("/kitchen", getKitchenReports);

export default router;
