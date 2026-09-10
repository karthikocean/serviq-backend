import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import imageService from "../utils/upload";
import { sendSuccess, sendError } from "../utils/response";


export const uploadFile = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.files || Object.keys(req.files).length === 0) {
            sendError(res, "No files were uploaded.", StatusCodes.BAD_REQUEST);
            return;
        }

        const fileKey = req.files.file ? "file" : req.files.image ? "image" : req.files.document ? "document" : Object.keys(req.files)[0];
        const file = req.files[fileKey] as any;

        if (!file) {
            sendError(res, "No file found in request.", StatusCodes.BAD_REQUEST);
            return;
        }

        const moduleName = (req.body.moduleName || req.body.module || "uploads").trim();
        const type = req.body.type || (file.mimetype && file.mimetype.startsWith("image/") ? "image" : "document");
        const oldFileName = req.body.oldFileName;

        const result = await imageService.uploadFile({
            file,
            moduleName,
            type,
            oldFileName,
            req
        });

        sendSuccess(res, "File uploaded successfully.", result, StatusCodes.CREATED);
    } catch (error: any) {
        console.error("Upload Error:", error);
        sendError(res, error.message || "Internal server error.", StatusCodes.BAD_REQUEST);
    }
};


export const deleteFile = async (req: Request, res: Response): Promise<void> => {
    try {
        const filePath = (req.body.filePath || req.query.filePath) as string | undefined;
        const moduleName = (req.body.moduleName || req.query.moduleName) as string | undefined;
        const fileName = (req.body.fileName || req.query.fileName) as string | undefined;

        if (!filePath && (!moduleName || !fileName)) {
            sendError(res, "Either 'filePath' or both 'moduleName' and 'fileName' are required.", StatusCodes.BAD_REQUEST);
            return;
        }

        const success = await imageService.deleteFile({
            filePath,
            moduleName,
            fileName
        });

        if (!success) {
            sendError(res, "File not found or failed to delete.", StatusCodes.NOT_FOUND);
            return;
        }

        sendSuccess(res, "File deleted successfully.", { deleted: true }, StatusCodes.OK);
    } catch (error: any) {
        console.error("Delete Error:", error);
        sendError(res, error.message || "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
    }
};
