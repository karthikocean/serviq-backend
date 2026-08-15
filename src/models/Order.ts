import mongoose, { Schema, Document } from "mongoose";

export interface IOrderItem {
    menuId: mongoose.Types.ObjectId;
    name: string;
    qty: number;
    price: number;
    status: "new" | "preparing" | "ready" | "done";
}

export interface IOrder extends Document {
    restaurantId: mongoose.Types.ObjectId;
    branchId: mongoose.Types.ObjectId;
    orderId: string;
    tableId: mongoose.Types.ObjectId;
    time: string;
    items: IOrderItem[];
    notes: string;
    subtotal: number;
    tax: number;
    charge: number;
    total: number;
    discount: number;
    status: "new" | "preparing" | "ready" | "done";
    billingStatus: "unpaid" | "paid";
    paymentMethod?: "cash" | "card" | "upi" | null;
    waiterId?: mongoose.Types.ObjectId;
    isDelete: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

const orderSchema = new Schema<IOrder>(
    {
        restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
        branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true },
        orderId: { type: String, required: true, unique: true },
        tableId: { type: Schema.Types.ObjectId, ref: "Table", required: true },
        time: { type: String, required: true },
        items: [
            {
                menuId: { type: Schema.Types.ObjectId, ref: "Menu", required: true },
                name: { type: String, required: true },
                qty: { type: Number, required: true },
                price: { type: Number, required: true },
                status: { type: String, enum: ["new", "preparing", "ready", "done"], default: "new" }
            }
        ],
        notes: { type: String, default: "" },
        subtotal: { type: Number, required: true },
        tax: { type: Number, required: true },
        charge: { type: Number, default: 0 },
        total: { type: Number, required: true },
        discount: { type: Number, default: 0 },
        status: { type: String, enum: ["new", "preparing", "ready", "done"], default: "new" },
        billingStatus: { type: String, enum: ["unpaid", "paid"], default: "unpaid" },
        paymentMethod: { type: String, enum: ["cash", "card", "upi"], default: null },
        waiterId: { type: Schema.Types.ObjectId, ref: "User", default: null },
        isDelete: { type: Boolean, default: false }
    },
    { timestamps: true }
);

const Order = mongoose.model<IOrder>("Order", orderSchema);
export default Order;
