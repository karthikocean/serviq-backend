import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcryptjs";

export interface Itable extends Document {
    tableNumber: string;
    seatingCapacity: number;
    status: boolean;
    isActive: boolean;
    isDelete: boolean;
    assignedQrId?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

const tableSchema = new Schema<Itable>(
    {
        tableNumber: { type: String, required: true },
        seatingCapacity: { type: Number, required: true },
        status: { type: Boolean, default: false },
        isActive: { type: Boolean, default: true },
        isDelete: { type: Boolean, default: false },
        assignedQrId: { type: String, default: null }
    },
    { timestamps: true }
);



const table = mongoose.model<Itable>("table", tableSchema);
export default table;
