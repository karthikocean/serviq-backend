import fs from "fs";
import path from "path";

export interface UploadResponse {
    fileName: string;
    path: string;
    originalName: string;
}

export interface UploadOptions {
    file: any;
    moduleName: string;
    oldFileName?: string;
    req?: any;
}

export interface UnifiedUploadOptions extends UploadOptions {
    type: "image" | "file" | "document" | string;
}

const ALLOWED_IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg"];
const ALLOWED_DOCUMENT_EXTENSIONS = [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".txt", ".csv", ".zip"];

const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/jpg", "application/pdf"];
const ALLOWED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".pdf"];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB

class ImageService {
    async uploadImage(
        file: any,
        moduleName: string,
        oldFileName?: string,
        req?: any
    ): Promise<UploadResponse> {
        if (!file) {
            throw new Error("No file provided for upload");
        }
        if (!moduleName) {
            throw new Error("Module name is required");
        }

        const originalName = file.name || "unnamed";
        const extension = path.extname(originalName).toLowerCase();
        const mimeType = (file.mimetype || file.type || "").toLowerCase();

        if (!ALLOWED_IMAGE_EXTENSIONS.includes(extension)) {
            throw new Error(`Invalid image extension. Only PNG, JPG, JPEG are allowed.`);
        }

        if (mimeType && !["image/png", "image/jpeg", "image/jpg"].includes(mimeType)) {
            throw new Error(`Invalid image file type. Only PNG, JPG, JPEG are allowed.`);
        }

        if (file.size && file.size > MAX_IMAGE_SIZE) {
            throw new Error("Image file size exceeds the 5MB limit");
        }

        const fileName = `${moduleName}_${Date.now()}${extension}`;
        const folderPath = path.join(process.cwd(), "public", "uploads", moduleName);
        const filePath = path.join(folderPath, fileName);

        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }

        // Delete old file if provided
        if (oldFileName) {
            const oldPath = path.join(folderPath, oldFileName);
            if (fs.existsSync(oldPath)) {
                fs.unlinkSync(oldPath);
            }
        }

        // Save file
        if (file.mv) {
            await new Promise<void>((resolve, reject) => {
                file.mv(filePath, (err: any) => {
                    if (err) return reject(err);
                    resolve();
                });
            });
        } else if (file.data) {
            await fs.promises.writeFile(filePath, file.data);
        } else {
            throw new Error("Unsupported file format or file data missing");
        }

        const relativePath = `/uploads/${moduleName}/${fileName}`;

        return {
            fileName,
            path: relativePath,
            originalName
        };
    }


    async uploadDocument(
        file: any,
        moduleName: string,
        oldFileName?: string,
        req?: any
    ): Promise<UploadResponse> {
        if (!file) {
            throw new Error("No file provided for upload");
        }
        if (!moduleName) {
            throw new Error("Module name is required");
        }

        const originalName = file.name || "unnamed";
        const extension = path.extname(originalName).toLowerCase();

        if (!ALLOWED_DOCUMENT_EXTENSIONS.includes(extension) && !ALLOWED_IMAGE_EXTENSIONS.includes(extension)) {
            throw new Error(`Invalid file extension. Allowed: ${ALLOWED_DOCUMENT_EXTENSIONS.concat(ALLOWED_IMAGE_EXTENSIONS).join(", ")}`);
        }

        if (file.size && file.size > MAX_DOCUMENT_SIZE) {
            throw new Error("Document file size exceeds the 10MB limit");
        }

        const fileName = `${moduleName}_${Date.now()}${extension}`;
        const folderPath = path.join(process.cwd(), "public", "uploads", moduleName);
        const filePath = path.join(folderPath, fileName);

        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }

        if (oldFileName) {
            const oldPath = path.join(folderPath, oldFileName);
            if (fs.existsSync(oldPath)) {
                fs.unlinkSync(oldPath);
            }
        }

        // Save file
        if (file.mv) {
            await new Promise<void>((resolve, reject) => {
                file.mv(filePath, (err: any) => {
                    if (err) return reject(err);
                    resolve();
                });
            });
        } else if (file.data) {
            await fs.promises.writeFile(filePath, file.data);
        } else {
            throw new Error("Unsupported file format or file data missing");
        }

        const relativePath = `/uploads/${moduleName}/${fileName}`;

        return {
            fileName,
            path: relativePath,
            originalName
        };
    }

    /* ----------------------------------------
     UNIFIED FILE UPLOAD FUNCTION
    ---------------------------------------- */
    async uploadFile(options: UnifiedUploadOptions): Promise<UploadResponse> {
        const { file, type, moduleName, oldFileName, req } = options;
        if (type === "image") {
            return this.uploadImage(file, moduleName, oldFileName, req);
        } else {
            return this.uploadDocument(file, moduleName, oldFileName, req);
        }
    }

    /* ----------------------------------------
     DELETE IMAGE
    ---------------------------------------- */
    async deleteImage(moduleName: string, fileName: string): Promise<boolean> {
        try {
            let filePath = path.join(process.cwd(), "public", moduleName, fileName);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                return true;
            }
            filePath = path.join(process.cwd(), "public", "images", moduleName, fileName);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                return true;
            }
            return false;
        } catch (error) {
            console.error("deleteImage error:", error);
            return false;
        }
    }

    async deleteDocument(moduleName: string, fileName: string): Promise<boolean> {
        try {
            let filePath = path.join(process.cwd(), "public", moduleName, fileName);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                return true;
            }
            filePath = path.join(process.cwd(), "public", "files", moduleName, fileName);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                return true;
            }
            return false;
        } catch (error) {
            console.error("deleteDocument error:", error);
            return false;
        }
    }

    /* ----------------------------------------
     UNIFIED DELETE FILE METHOD
    ---------------------------------------- */
    async deleteFile(options: { type?: string; moduleName?: string; fileName?: string; filePath?: string }): Promise<boolean> {
        try {
            const { type, moduleName, fileName, filePath } = options;

            if (filePath) {
                let cleanPath = filePath;
                if (cleanPath.startsWith("http://") || cleanPath.startsWith("https://")) {
                    try {
                        const parsed = new URL(cleanPath);
                        cleanPath = parsed.pathname;
                    } catch (e) {
                        // ignore URL parse failure
                    }
                }
                if (cleanPath.startsWith("/public/")) {
                    cleanPath = cleanPath.replace("/public/", "/");
                }
                const relativePath = cleanPath.startsWith("/") ? cleanPath.slice(1) : cleanPath;

                let absolutePath = path.join(process.cwd(), "public", relativePath);
                if (fs.existsSync(absolutePath)) {
                    fs.unlinkSync(absolutePath);
                    return true;
                }

                absolutePath = path.join(process.cwd(), "public", "images", relativePath);
                if (fs.existsSync(absolutePath)) {
                    fs.unlinkSync(absolutePath);
                    return true;
                }

                absolutePath = path.join(process.cwd(), "public", "files", relativePath);
                if (fs.existsSync(absolutePath)) {
                    fs.unlinkSync(absolutePath);
                    return true;
                }
                return false;
            }

            if (moduleName && fileName) {
                const mainDeleted = await this.deleteImage(moduleName, fileName);
                if (mainDeleted) return true;
                return this.deleteDocument(moduleName, fileName);
            }

            return false;
        } catch (error) {
            console.error("deleteFile error:", error);
            return false;
        }
    }

    /* ----------------------------------------
     LEGACY SUPPORT METHODS
    ---------------------------------------- */
    async imageUpload(
        base64: string,
        folder: string,
        fileName: string,
        oldFileName?: string
    ): Promise<boolean> {
        try {
            const base64Data = base64.replace(/^data:.*;base64,/, "");
            const buffer = Buffer.from(base64Data, "base64");

            const folderPath = path.join(process.cwd(), "public", folder);
            const newFilePath = path.join(folderPath, fileName);

            if (!fs.existsSync(folderPath)) {
                fs.mkdirSync(folderPath, { recursive: true });
            }

            if (oldFileName) {
                const oldPath = path.join(folderPath, oldFileName);
                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                }
            }

            await fs.promises.writeFile(newFilePath, buffer);
            return true;
        } catch (error) {
            console.error("imageUpload error:", error);
            return false;
        }
    }

    async fileUpload(
        file: any,
        folder: string,
        fileName: string,
        oldFileName?: string
    ): Promise<boolean> {
        try {
            if (!file || (!file.data && !file.mv)) return false;

            const folderPath = path.join(process.cwd(), "public", folder);
            const filePath = path.join(folderPath, fileName);

            if (!fs.existsSync(folderPath)) {
                fs.mkdirSync(folderPath, { recursive: true });
            }

            if (oldFileName) {
                const oldPath = path.join(folderPath, oldFileName);
                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                }
            }

            if (file.mv) {
                await new Promise<void>((resolve, reject) => {
                    file.mv(filePath, (err: any) => {
                        if (err) return reject(err);
                        resolve();
                    });
                });
            } else {
                await fs.promises.writeFile(filePath, file.data);
            }

            return true;
        } catch (error) {
            console.error("fileUpload error:", error);
            return false;
        }
    }

    async fileUploadForBufferData(
        fileBuffer: Buffer,
        folder: string,
        fileName: string,
        oldFileName?: string
    ): Promise<boolean> {
        try {
            const folderPath = path.join(process.cwd(), "public", folder);
            const filePath = path.join(folderPath, fileName);

            if (!fs.existsSync(folderPath)) {
                fs.mkdirSync(folderPath, { recursive: true });
            }

            if (oldFileName) {
                const oldPath = path.join(folderPath, oldFileName);
                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                }
            }

            await fs.promises.writeFile(filePath, fileBuffer);
            return true;
        } catch (error) {
            console.error("fileUploadForBufferData error:", error);
            return false;
        }
    }

    async validateImageFile(file: any) {
        if (!file) {
            throw new Error("File not found");
        }

        const extension = path.extname(file.name).toLowerCase();
        const mimeType = file.mimetype;

        if (!ALLOWED_EXTENSIONS.includes(extension)) {
            throw new Error("Invalid file extension. Allowed: png, jpg, jpeg, pdf");
        }

        if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
            throw new Error("Invalid file type. Only images and PDFs allowed");
        }

        if (file.size > MAX_DOCUMENT_SIZE) {
            throw new Error("File size exceeds 10MB limit");
        }

        return extension;
    }
}

const imageService = new ImageService();
export default imageService;
