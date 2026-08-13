import mongoose, { Schema, Document } from "mongoose";

export interface IQrCode extends Document {
    restaurantId: mongoose.Types.ObjectId;
    branchId: mongoose.Types.ObjectId;
    qrCodeId: string;
    status: "Assigned" | "Unassigned";
    tableId: string | null;
    scansCount: number;
    isDelete: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

const qrCodeSchema = new Schema<IQrCode>(
    {
        restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
        branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true },
        qrCodeId: { type: String, required: true, unique: true },
        status: { type: String, enum: ["Assigned", "Unassigned"], default: "Unassigned" },
        tableId: { type: String, default: null }, // tableNumber mapping (e.g. "T-01")
        scansCount: { type: Number, default: 0 },
        isDelete: { type: Boolean, default: false }
    },
    { timestamps: true }
);

const QrCode = mongoose.model<IQrCode>("QrCode", qrCodeSchema);
export default QrCode;
