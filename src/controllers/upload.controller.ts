import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import path from "path";
import fs from "fs";
import { sendSuccess, sendError } from "../utils/response";

export const uploadFile = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.files || Object.keys(req.files).length === 0) {
            sendError(res, "No files were uploaded.", StatusCodes.BAD_REQUEST);
            return;
        }

        // 'image' is the name of the input field
        const file = req.files.image as any;
        
        if (!file) {
            sendError(res, "No image file found in the request under the 'image' field.", StatusCodes.BAD_REQUEST);
            return;
        }

        // Ensure uploads directory exists
        const uploadPathDir = path.join(process.cwd(), "public", "uploads");
        if (!fs.existsSync(uploadPathDir)) {
            fs.mkdirSync(uploadPathDir, { recursive: true });
        }

        // Create unique filename
        const timestamp = Date.now();
        const extension = path.extname(file.name).toLowerCase();
        
        // Allowed file types restriction
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf', '.xls', '.xlsx', '.csv'];
        if (!allowedExtensions.includes(extension)) {
            sendError(res, `Invalid file format. Only ${allowedExtensions.join(', ')} are allowed.`, StatusCodes.BAD_REQUEST);
            return;
        }

        // Maximum file size restriction (e.g., 5MB)
        const MAX_SIZE = 5 * 1024 * 1024; // 5 Megabytes
        if (file.size > MAX_SIZE) {
            sendError(res, "File size exceeds the 5MB limit.", StatusCodes.BAD_REQUEST);
            return;
        }

        const fileName = `${timestamp}-${Math.round(Math.random() * 1e9)}${extension}`;
        const uploadPath = path.join(uploadPathDir, fileName);

        // Use the mv() method to place the file somewhere on your server
        await file.mv(uploadPath);

        // Construct the URL to return
        const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${fileName}`;

        sendSuccess(res, "File uploaded successfully.", { url: fileUrl }, StatusCodes.CREATED);
    } catch (error) {
        console.error("Upload Error:", error);
        sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};
