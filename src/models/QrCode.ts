import mongoose, { Schema, Document } from "mongoose";

export interface IQrCode extends Document {
    restaurantId: mongoose.Types.ObjectId;
    branchId: mongoose.Types.ObjectId;
    qrCodeId: string;
    qrUrl: string;
    status: "Assigned" | "Unassigned";
    tableId: mongoose.Types.ObjectId | null;
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
        qrUrl: { type: String, default: "" },
        status: { type: String, enum: ["Assigned", "Unassigned"], default: "Unassigned" },
        tableId: { type: Schema.Types.ObjectId, ref: "Table", default: null },
        scansCount: { type: Number, default: 0 },
        isDelete: { type: Boolean, default: false }
    },
    { timestamps: true }
);

const QrCode = mongoose.model<IQrCode>("QrCode", qrCodeSchema);
export default QrCode;
