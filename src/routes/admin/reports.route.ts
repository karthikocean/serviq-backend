import { Router } from "express";
import {
  getWaiterReports,
  getKitchenReports,
  getTaxSettlementReports,
  getSalesRevenueReports,
  getDishPerformanceReports,
  getOrderAnalyticsReports,
  getInventoryStockReports
} from "../../controllers/admin/reports.controller";

const router = Router();

// @route   GET /api/admin/reports/waiter
// @route   POST /api/admin/reports/waiter
// @desc    Get Waiter performance reports
// @access  Private
router.get("/waiter", getWaiterReports);
router.post("/waiter", getWaiterReports);

// @route   GET /api/admin/reports/staff-performance
// @route   POST /api/admin/reports/staff-performance
// @desc    Get Staff performance reports (with quick presets & filters)
// @access  Private
router.get("/staff-performance", getWaiterReports);
router.post("/staff-performance", getWaiterReports);

// @route   GET /api/admin/reports/kitchen
// @desc    Get Kitchen performance reports
// @access  Private
router.get("/kitchen", getKitchenReports);

// @route   GET /api/admin/reports/dish-performance
// @route   POST /api/admin/reports/dish-performance
// @desc    Get Dish performance reports (with quick presets & filters)
// @access  Private
router.get("/dish-performance", getDishPerformanceReports);
router.post("/dish-performance", getDishPerformanceReports);

// @route   GET /api/admin/reports/tax-settlement
// @route   POST /api/admin/reports/tax-settlement
// @desc    Get Tax & Payment Settlement reports (with quick presets & filters)
// @access  Private
router.get("/tax-settlement", getTaxSettlementReports);
router.post("/tax-settlement", getTaxSettlementReports);

// @route   GET /api/admin/reports/sales-revenue
// @route   POST /api/admin/reports/sales-revenue
// @desc    Get Sales & Revenue reports (with quick presets & filters)
// @access  Private
router.get("/sales-revenue", getSalesRevenueReports);
router.post("/sales-revenue", getSalesRevenueReports);

// @route   GET /api/admin/reports/order-analytics
// @route   POST /api/admin/reports/order-analytics
// @desc    Get Order Analytics reports (with quick presets & filters)
// @access  Private
router.get("/order-analytics", getOrderAnalyticsReports);
router.post("/order-analytics", getOrderAnalyticsReports);

// @route   GET /api/admin/reports/inventory-stock
// @route   POST /api/admin/reports/inventory-stock
// @desc    Get Inventory & Stock reports (with quick presets & filters)
// @access  Private
router.get("/inventory-stock", getInventoryStockReports);
router.post("/inventory-stock", getInventoryStockReports);

export default router;


