import { Router } from "express";
import { login, getProfile, logout } from "../controllers/admin/auth.controller";
import { getDashboard } from "../controllers/admin/dashboard.controller";
import { protect } from "../middleware/authMiddleware";
import { createTable, getTables, getTable, updateTable, deleteTable } from "../controllers/admin/table.controller";
import { getQrCodes, generateQrCode, assignQrCode, revokeQrCode, deleteQrCode } from "../controllers/admin/qr.controller";
import { getOrders, createOrder, updateOrder, deleteOrder, payBill } from "../controllers/admin/order.controller";
const router = Router();

// Auth
router.post("/login", login);
router.post("/logout", protect, logout);
router.get("/profile", protect, getProfile);

// Dashboard
router.get("/dashboard", protect, getDashboard);
router.post("/table", createTable);
router.get("/table",  getTables);
router.get("/table/:id",  getTable);
router.put("/table/:id",  updateTable);
router.patch("/table/:id", updateTable);
router.delete("/table/:id",  deleteTable);

// QR Codes
router.get("/qr", getQrCodes);
router.post("/qr", generateQrCode);
router.post("/qr/assign", assignQrCode);
router.post("/qr/revoke", revokeQrCode);
router.delete("/qr/:id", deleteQrCode);

// Orders & Billing
router.get("/orders", getOrders);
router.post("/orders", createOrder);
router.put("/orders/:id", updateOrder);
router.delete("/orders/:id", deleteOrder);
router.post("/billing/pay", payBill);

export default router;
