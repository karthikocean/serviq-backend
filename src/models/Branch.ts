import mongoose, { Schema, Document } from "mongoose";

export interface IBranch extends Document {
  restaurantId: mongoose.Types.ObjectId;
  branchName: string;
  branchCode: string;
  branchOpeningDate?: Date;
  contactNumber: string;
  email?: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    pincode: string;
  };
  isMainBranch: boolean;
  isActive: boolean;
  isDelete: boolean;
}

const BranchSchema = new Schema<IBranch>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
    branchName: { type: String, required: true },
    branchCode: { type: String, required: true },
    branchOpeningDate: { type: Date },
    contactNumber: { type: String, required: true },
    email: { type: String },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      country: { type: String, required: true },
      pincode: { type: String, required: true },
    },
    isMainBranch: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isDelete: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Branch = mongoose.model<IBranch>("Branch", BranchSchema);
export default Branch;
