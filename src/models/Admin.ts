import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcryptjs";

export interface IAdmin extends Document {
  name: string;
  email: string;
  phoneNumber: string;
  password?: string;
  profileImage?: string;
  userType: 'RESTAURANT_OWNER' | 'BRANCH_ADMIN';
  restaurantId: mongoose.Types.ObjectId;
  branchId?: mongoose.Types.ObjectId;
  roleId?: mongoose.Types.ObjectId;
  isActive: boolean;
  status: 'Active' | 'Inactive';
  isDelete: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const AdminSchema = new Schema<IAdmin>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phoneNumber: { type: String, required: true, unique: true },
    password: { type: String },
    profileImage: { type: String, default: null },
    userType: { type: String, enum: ['RESTAURANT_OWNER', 'BRANCH_ADMIN'], required: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch" },
    roleId: { type: Schema.Types.ObjectId, ref: "AdminRole" },
    isActive: { type: Boolean, default: true },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    isDelete: { type: Boolean, default: false },
  },
  { timestamps: true }
);

AdminSchema.pre("save", async function () {
  if (!this.isModified("password") || !this.password) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

const Admin = mongoose.model<IAdmin>("Admin", AdminSchema);
export default Admin;
