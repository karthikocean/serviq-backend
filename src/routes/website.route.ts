import { Router } from "express";
import {
  scanQrCode,
  getHeaderInfo,
  verifySession,
  sendQuickHelp,
  getCategories,
  getMenuItems,
  getSpecials,
  getOrders,
  getCart,
  updateCartItem,
  removeCartItem,
  clearCart,
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

// 3. Verify Active Table Dining Session
router.post("/session/verify", verifySession);

// 4. Quick Help Service Request (Water, Bill, Message)
router.post("/service-request", sendQuickHelp);

// 5. Menu Categories
router.get("/categories", getCategories);

// 6. Menu Items (with search, category filter, veg/non-veg, best-seller)
router.get("/menu", getMenuItems);

// 7. Today's Specials
router.get("/specials", getSpecials);

// 8. Backend Cart Management
router.get("/cart", getCart);
router.post("/cart/item", updateCartItem);
router.delete("/cart/item/:menuId", removeCartItem);
router.post("/cart/clear", clearCart);

// 9. Active Orders & Aggregated Bill for Table
router.get("/orders", getOrders);
router.get("/bill", getOrders);

// 10. Create Order (Cart Checkout with Idempotency)
router.post("/orders/create", createCustomerOrder);

export default router;
