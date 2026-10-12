import mongoose, { Schema, Document } from "mongoose";

export interface IBranchTransfer extends Document {
  restaurantId: mongoose.Types.ObjectId;
  transferNo: string;
  fromBranch: string;
  fromBranchId?: mongoose.Types.ObjectId;
  toBranch: string;
  toBranchId?: mongoose.Types.ObjectId;
  itemId?: mongoose.Types.ObjectId;
  itemName: string;
  quantity: number;
  unit: string;
  status: "Pending" | "Approved" | "Dispatched" | "Received" | "Rejected" | "Completed";
  transferDate: Date;
  remarks?: string;
  createdBy?: mongoose.Types.ObjectId;
  isDelete: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const branchTransferSchema = new Schema<IBranchTransfer>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
    transferNo: { type: String, required: true },
    fromBranch: { type: String, required: true },
    fromBranchId: { type: Schema.Types.ObjectId, ref: "Branch" },
    toBranch: { type: String, required: true },
    toBranchId: { type: Schema.Types.ObjectId, ref: "Branch" },
    itemId: { type: Schema.Types.ObjectId, ref: "InventoryItem" },
    itemName: { type: String, required: true },
    quantity: { type: Number, required: true },
    unit: { type: String, default: "kg" },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Dispatched", "Received", "Rejected", "Completed"],
      default: "Pending"
    },
    transferDate: { type: Date, default: Date.now },
    remarks: { type: String, default: "" },
    createdBy: { type: Schema.Types.ObjectId, ref: "Admin" },
    isDelete: { type: Boolean, default: false }
  },
  { timestamps: true }
);

const BranchTransfer = mongoose.model<IBranchTransfer>("BranchTransfer", branchTransferSchema);
export default BranchTransfer;
