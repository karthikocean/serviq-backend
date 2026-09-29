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
// @desc    Get Waiter performance reports
// @access  Private
router.get("/waiter", getWaiterReports);

// @route   GET /api/admin/reports/staff-performance
// @desc    Get Staff performance reports
// @access  Private
router.get("/staff-performance", getWaiterReports);

// @route   GET /api/admin/reports/kitchen
// @desc    Get Kitchen performance reports
// @access  Private
router.get("/kitchen", getKitchenReports);

// @route   GET /api/admin/reports/dish-performance
// @desc    Get Dish performance reports
// @access  Private
router.get("/dish-performance", getDishPerformanceReports);

// @route   GET /api/admin/reports/tax-settlement
// @desc    Get Tax & Payment Settlement reports
// @access  Private
router.get("/tax-settlement", getTaxSettlementReports);

// @route   GET /api/admin/reports/sales-revenue
// @desc    Get Sales & Revenue reports
// @access  Private
router.get("/sales-revenue", getSalesRevenueReports);

// @route   GET /api/admin/reports/order-analytics
// @desc    Get Order Analytics reports
// @access  Private
router.get("/order-analytics", getOrderAnalyticsReports);

// @route   GET /api/admin/reports/inventory-stock
// @desc    Get Inventory & Stock reports
// @access  Private
router.get("/inventory-stock", getInventoryStockReports);

export default router;


