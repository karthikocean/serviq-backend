import mongoose, { Schema, Document } from "mongoose";

export interface IInventoryRequest extends Document {
  restaurantId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  branchName?: string;
  requestNo: string;
  itemId?: mongoose.Types.ObjectId;
  itemName: string;
  reqQty: number;
  appQty?: number;
  distQty?: number;
  unit: string;
  status: "Pending" | "Approved" | "Dispatched" | "Rejected" | "Completed";
  requestDate: Date;
  remarks?: string;
  isDelete: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const inventoryRequestSchema = new Schema<IInventoryRequest>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true },
    branchName: { type: String, default: "" },
    requestNo: { type: String, required: true },
    itemId: { type: Schema.Types.ObjectId, ref: "InventoryItem" },
    itemName: { type: String, required: true },
    reqQty: { type: Number, required: true },
    appQty: { type: Number, default: 0 },
    distQty: { type: Number, default: 0 },
    unit: { type: String, default: "kg" },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Dispatched", "Rejected", "Completed"],
      default: "Pending"
    },
    requestDate: { type: Date, default: Date.now },
    remarks: { type: String, default: "" },
    isDelete: { type: Boolean, default: false }
  },
  { timestamps: true }
);

const InventoryRequest = mongoose.model<IInventoryRequest>("InventoryRequest", inventoryRequestSchema);
export default InventoryRequest;
