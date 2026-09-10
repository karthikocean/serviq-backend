import { Router } from "express";
import { uploadFile, deleteFile } from "../controllers/upload.controller";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Upload
 *   description: Dynamic module file upload & delete endpoints
 */

/**
 * @swagger
 * /api/upload:
 *   post:
 *     summary: Upload a file for any module
 *     tags: [Upload]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: File to upload (key can be file, image, or document)
 *               moduleName:
 *                 type: string
 *                 example: menu_items
 *                 description: Target module directory name
 *               type:
 *                 type: string
 *                 example: image
 *                 description: Type of file (image, file, document)
 *               oldFileName:
 *                 type: string
 *                 description: Optional existing file name to overwrite/delete
 *     responses:
 *       201:
 *         description: File uploaded successfully with fileName, path, url, and originalName
 *       400:
 *         description: Bad Request
 *       500:
 *         description: Internal Server Error
 *   delete:
 *     summary: Delete an uploaded file
 *     tags: [Upload]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               filePath:
 *                 type: string
 *                 example: /menu_items/menu_items_1715000000000.png
 *               moduleName:
 *                 type: string
 *                 example: menu_items
 *               fileName:
 *                 type: string
 *                 example: menu_items_1715000000000.png
 *     responses:
 *       200:
 *         description: File deleted successfully
 *       400:
 *         description: Bad Request
 *       404:
 *         description: File not found
 *       500:
 *         description: Internal Server Error
 */
router.post("/", uploadFile);
router.delete("/", deleteFile);

export default router;
