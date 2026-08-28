import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import PDFDocument from "pdfkit";
import Payment from "../../models/Payment";
import Restaurant from "../../models/Restaurant";
import Subscription from "../../models/Subscription";
import { sendSuccess, sendError } from "../../utils/response";
import { pagination } from "../../utils/pagination";

// GET all payments with optional filtering and pagination
export const getPayments = async (req: Request, res: Response): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string) || 0;
        const limit = parseInt(req.query.limit as string) || 10;
        const pageIndex = Math.max(0, page);
        const skip = pageIndex * limit;

        const { search, status } = req.query;

        const query: any = { isDelete: false };

        if (status && status !== "All" && status !== "all") {
            query.paymentStatus = { $regex: `^${status}$`, $options: "i" };
        }

        if (search) {
            const matchedRestaurants = await Restaurant.find({
                restaurantName: { $regex: search as string, $options: "i" }
            }).select("_id");
            const restaurantIds = matchedRestaurants.map(r => r._id);

            query.$or = [
                { transactionId: { $regex: search as string, $options: "i" } },
                { restaurant: { $in: restaurantIds } }
            ];
        }

        const total = await Payment.countDocuments(query);

        const payments = await Payment.find(query)
            .populate("restaurant", "restaurantName restaurantId")
            .populate({
                path: "subscription",
                select: "plan billingCycle startDate endDate status",
                populate: {
                    path: "plan",
                    select: "planName"
                }
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // Format data to match front-end expectations
        const formattedPayments = payments.map((payment: any) => {
            const year = new Date(payment.createdAt || Date.now()).getFullYear();
            const invoiceId = `INV-${year}-${payment._id.toString().slice(-4).toUpperCase()}`;

            return {
                _id: payment._id,
                invoiceId,
                restaurantName: payment.restaurant?.restaurantName || "N/A",
                restaurantId: payment.restaurant?.restaurantId || "N/A",
                planName: payment.subscription?.plan?.planName || "N/A",
                amount: payment.amount,
                taxAmount: payment.taxAmount || 0,
                paymentDate: payment.paymentDate ? new Date(payment.paymentDate).toISOString().split('T')[0] : "—",
                paymentStatus: payment.paymentStatus,
                transactionId: payment.transactionId || "—",
                paymentMethod: payment.paymentMethod || "—",
                createdAt: payment.createdAt
            };
        });

        pagination(total, formattedPayments, limit, pageIndex, res, "Payments fetched successfully.");
    } catch (error) {
        console.error("Get Payments Error:", error);
        sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

// GET Download Receipt as PDF
export const downloadReceipt = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        if (typeof id !== "string" || !mongoose.Types.ObjectId.isValid(id)) {
            sendError(res, "Invalid payment ID.", StatusCodes.BAD_REQUEST);
            return;
        }

        const payment = await Payment.findOne({ _id: id, isDelete: false })
            .populate("restaurant", "restaurantName restaurantId contactEmail contactNumber address")
            .populate({
                path: "subscription",
                select: "plan billingCycle startDate endDate status",
                populate: {
                    path: "plan",
                    select: "planName description"
                }
            });

        if (!payment) {
            sendError(res, "Payment not found.", StatusCodes.NOT_FOUND);
            return;
        }

        const year = new Date(payment.createdAt || Date.now()).getFullYear();
        const invoiceId = `INV-${year}-${payment._id.toString().slice(-4).toUpperCase()}`;

        // Create PDF Document
        const doc = new PDFDocument({ margin: 50, size: "A4" });

        // Buffer the PDF to send it at once
        const buffers: Buffer[] = [];
        doc.on("data", buffers.push.bind(buffers));
        doc.on("end", () => {
            const pdfData = Buffer.concat(buffers);
            res.writeHead(200, {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename=receipt-${invoiceId}.pdf`,
                "Content-Length": pdfData.length
            });
            res.end(pdfData);
        });

        // --- Document Layout Design ---

        // Draw header background band
        doc.rect(0, 0, 595.28, 120) // A4 width is 595.28 pt
           .fill("#1a202c");

        // Header Title
        doc.fillColor("#ffffff")
           .fontSize(24)
           .font("Helvetica-Bold")
           .text("SERVIQ", 50, 40);

        doc.fontSize(10)
           .font("Helvetica")
           .text("Premium Restaurant Operations & Table Ordering", 50, 70);

        // Receipt Label / Date / Invoice Info (Header right-side)
        doc.fillColor("#ffffff")
           .fontSize(18)
           .font("Helvetica-Bold")
           .text("PAYMENT RECEIPT", 350, 40, { align: "right", width: 195 });

        const formattedDate = payment.paymentDate
            ? new Date(payment.paymentDate).toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' })
            : "—";

        doc.fontSize(9)
           .font("Helvetica")
           .text(`Date: ${formattedDate}`, 350, 65, { align: "right", width: 195 })
           .text(`Receipt #: ${invoiceId}`, 350, 80, { align: "right", width: 195 });

        // Move cursor below the header band
        doc.y = 150;

        // Two-Column Section: Serviq Details & Bill To
        const midPoint = 280;

        // Column 1: Provider Details (Serviq)
        doc.fillColor("#1a202c")
           .fontSize(10)
           .font("Helvetica-Bold")
           .text("Issued By:", 50, 150)
           .font("Helvetica")
           .fillColor("#4a5568")
           .text("Serviq Technologies Pvt. Ltd.", 50, 165)
           .text("Support Email: billing@serviq.com", 50, 180)
           .text("Website: www.serviq.com", 50, 195);

        // Column 2: Restaurant (Bill To)
        const rest: any = payment.restaurant;
        doc.fillColor("#1a202c")
           .fontSize(10)
           .font("Helvetica-Bold")
           .text("Billed To:", midPoint, 150)
           .font("Helvetica")
           .fillColor("#4a5568")
           .text(rest?.restaurantName || "N/A", midPoint, 165)
           .text(`Restaurant ID: ${rest?.restaurantId || "N/A"}`, midPoint, 180)
           .text(rest?.contactEmail ? `Email: ${rest.contactEmail}` : "", midPoint, 195)
           .text(rest?.contactNumber ? `Phone: ${rest.contactNumber}` : "", midPoint, 210);

        // Divider Line
        doc.moveTo(50, 240)
           .lineTo(545, 240)
           .strokeColor("#e2e8f0")
           .lineWidth(1)
           .stroke();

        // Transaction Details
        doc.fillColor("#1a202c")
           .fontSize(10)
           .font("Helvetica-Bold")
           .text("Transaction Details", 50, 255);

        doc.fontSize(9)
           .font("Helvetica")
           .fillColor("#4a5568")
           .text(`Transaction ID: ${payment.transactionId || "—"}`, 50, 275)
           .text(`Payment Method: ${payment.paymentMethod || "—"}`, 50, 290)
           .text(`Payment Status: ${payment.paymentStatus}`, 50, 305);

        // Receipt Items Table Header
        const tableTop = 340;
        doc.rect(50, tableTop, 495, 25)
           .fill("#edf2f7");

        doc.fillColor("#2d3748")
           .fontSize(9)
           .font("Helvetica-Bold")
           .text("Item / Plan Description", 60, tableTop + 8)
           .text("Billing Cycle", 320, tableTop + 8, { width: 100, align: "center" })
           .text("Amount", 440, tableTop + 8, { width: 100, align: "right" });

        // Receipt Items Table Row
        const sub: any = payment.subscription;
        const rowTop = tableTop + 25;

        // Draw bottom border for the row
        doc.moveTo(50, rowTop + 40)
           .lineTo(545, rowTop + 40)
           .strokeColor("#edf2f7")
           .stroke();

        const planName = sub?.plan?.planName || "Subscription Plan";
        const cycle = sub?.billingCycle || "Monthly";

        doc.fillColor("#2d3748")
           .fontSize(9)
           .font("Helvetica-Bold")
           .text(planName, 60, rowTop + 10)
           .font("Helvetica")
           .fillColor("#718096")
           .text(`Subscription access for branch limits & features`, 60, rowTop + 22)
           .fillColor("#2d3748")
           .text(cycle, 320, rowTop + 10, { width: 100, align: "center" })
           .text(`INR ${payment.amount - (payment.taxAmount || 0)}`, 440, rowTop + 10, { width: 100, align: "right" });

        // Total Section (Right side)
        const totalTop = rowTop + 60;
        doc.fontSize(9)
           .fillColor("#4a5568")
           .font("Helvetica")
           .text("Subtotal:", 320, totalTop, { width: 100, align: "right" })
           .text(`INR ${payment.amount - (payment.taxAmount || 0)}`, 440, totalTop, { width: 100, align: "right" });

        doc.text("Tax Amount:", 320, totalTop + 15, { width: 100, align: "right" })
           .text(`INR ${payment.taxAmount || 0}`, 440, totalTop + 15, { width: 100, align: "right" });

        // Draw solid total bar
        doc.rect(320, totalTop + 35, 225, 25)
           .fill("#1a202c");

        doc.fillColor("#ffffff")
           .font("Helvetica-Bold")
           .text("Total Paid:", 330, totalTop + 43)
           .text(`INR ${payment.amount}`, 440, totalTop + 43, { width: 95, align: "right" });

        // Footer Message
        doc.fillColor("#a0aec0")
           .fontSize(8)
           .font("Helvetica")
           .text("Thank you for your business!", 50, 700, { align: "center", width: 495 })
           .text("This is a computer-generated document. No signature required.", 50, 715, { align: "center", width: 495 });

        doc.end();
    } catch (error) {
        console.error("Download Receipt Error:", error);
        sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};
