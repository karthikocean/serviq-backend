import { Router } from "express";
import {
  scanQrCode,
  getHeaderInfo,
  sendQuickHelp,
  getCategories,
  getMenuItems,
  getSpecials,
  getOrders,
  createCustomerOrder
} from "../controllers/website/website.controller";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Website
 *   description: Customer website endpoints for QR scan, menu, quick help, and ordering
 */

// 1. Resolve QR Code scan (or Table ID)
router.get("/scan/:qrCodeId", scanQrCode);
router.get("/scan", scanQrCode);

// 2. Fetch Restaurant & Table Header Info
router.get("/header", getHeaderInfo);

// 3. Quick Help Service Request (Water, Bill, Message)
router.post("/service-request", sendQuickHelp);

// 4. Menu Categories
router.get("/categories", getCategories);

// 5. Menu Items (with search, category filter, veg/non-veg, best-seller)
router.get("/menu", getMenuItems);

// 6. Today's Specials
router.get("/specials", getSpecials);

// 7. Active Orders for Table
router.get("/orders", getOrders);

// 8. Create Order (Cart Checkout)
router.post("/orders/create", createCustomerOrder);

export default router;
