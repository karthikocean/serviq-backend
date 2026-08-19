import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcryptjs";

export interface Itable extends Document {
    restaurantId: mongoose.Types.ObjectId;
    branchId: mongoose.Types.ObjectId;
    tableNumber: string;
    seatingCapacity: number;
    status: string;
    isActive: boolean;
    isDelete: boolean;
    assignedQrId?: string | null;
    qrUrl?: string;
    section?: string;
    assignedWaiter?: mongoose.Types.ObjectId;
    coverWaiter?: mongoose.Types.ObjectId;
    createdAt?: Date;
    updatedAt?: Date;
}

const tableSchema = new Schema<Itable>(
    {
        restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
        branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true },
        tableNumber: { type: String, required: true },
        seatingCapacity: { type: Number, required: true },
        status: { type: String, default: "Available" },
        isActive: { type: Boolean, default: true },
        isDelete: { type: Boolean, default: false },
        assignedQrId: { type: String, default: null },
        qrUrl: { type: String, default: "" },
        section: { type: String, default: "Main" },
        assignedWaiter: { type: Schema.Types.ObjectId, ref: "User", default: null },
        coverWaiter: { type: Schema.Types.ObjectId, ref: "User", default: null }
    },
    { timestamps: true }
);



const table = mongoose.model<Itable>("table", tableSchema);
export default table;
