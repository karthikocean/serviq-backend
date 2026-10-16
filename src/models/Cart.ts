import mongoose, { Schema, Document } from "mongoose";

export interface ICartItem {
  menuId: mongoose.Types.ObjectId;
  name: string;
  qty: number;
  price: number;
  notes?: string;
}

export interface ICart extends Document {
  restaurantId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  tableId: mongoose.Types.ObjectId;
  guestId: string;
  items: ICartItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: "active" | "ordered";
  idempotencyKey?: string | null;
  expiresAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const cartSchema = new Schema<ICart>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true, index: true },
    tableId: { type: Schema.Types.ObjectId, ref: "Table", required: true, index: true },
    guestId: { type: String, required: true, index: true },
    items: [
      {
        menuId: { type: Schema.Types.ObjectId, ref: "Menu", required: true },
        name: { type: String, required: true },
        qty: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true, min: 0 },
        notes: { type: String, default: "" }
      }
    ],
    subtotal: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    status: { type: String, enum: ["active", "ordered"], default: "active", index: true },
    idempotencyKey: { type: String, default: null, index: true },
    // Abandoned carts TTL index - expires based on dynamic expiresAt
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 4 * 60 * 60 * 1000) // 4 hours from last touch
    }
  },
  { timestamps: true }
);

// TTL index to automatically purge abandoned carts
cartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// Compound index for active cart lookups
cartSchema.index({ restaurantId: 1, branchId: 1, tableId: 1, guestId: 1, status: 1 });

const Cart = mongoose.model<ICart>("Cart", cartSchema);
export default Cart;
