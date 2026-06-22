import mongoose, { Schema, Document } from "mongoose";

export interface IOrderItem {
    name: string;
    qty: number;
    price: number;
    status?: string;
}

export interface IOrder extends Document {
    orderId: string;
    table: string;
    time: string;
    items: IOrderItem[];
    notes: string;
    subtotal: number;
    tax: number;
    charge: number;
    total: number;
    status: "new" | "preparing" | "ready" | "done";
    billingStatus: "unpaid" | "paid";
    waiter: string;
    isDelete: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

const orderSchema = new Schema<IOrder>(
    {
        orderId: { type: String, required: true, unique: true },
        table: { type: String, required: true },
        time: { type: String, required: true },
        items: [
            {
                name: { type: String, required: true },
                qty: { type: Number, required: true },
                price: { type: Number, required: true },
                status: { type: String, default: "new" }
            }
        ],
        notes: { type: String, default: "" },
        subtotal: { type: Number, required: true },
        tax: { type: Number, required: true },
        charge: { type: Number, default: 0 },
        total: { type: Number, required: true },
        status: { type: String, enum: ["new", "preparing", "ready", "done"], default: "new" },
        billingStatus: { type: String, enum: ["unpaid", "paid"], default: "unpaid" },
        waiter: { type: String, default: "Unassigned" },
        isDelete: { type: Boolean, default: false }
    },
    { timestamps: true }
);

const Order = mongoose.model<IOrder>("Order", orderSchema);
export default Order;
