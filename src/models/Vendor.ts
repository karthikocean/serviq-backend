import mongoose, { Schema, Document } from "mongoose";

export interface IVendor extends Document {
  restaurantId: mongoose.Types.ObjectId;
  branchId?: mongoose.Types.ObjectId;
  vendorCode: string;
  name: string;
  companyName: string;
  phone: string;
  status: "ACTIVE" | "INACTIVE";
  isDelete: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const vendorSchema = new Schema<IVendor>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch" },
    vendorCode: { type: String, required: true },
    name: { type: String, required: true },
    companyName: { type: String, default: "" },
    phone: { type: String, default: "" },
    status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE" },
    isDelete: { type: Boolean, default: false }
  },
  { timestamps: true }
);

const Vendor = mongoose.model<IVendor>("Vendor", vendorSchema);
export default Vendor;
