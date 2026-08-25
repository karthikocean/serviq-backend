import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcryptjs";

export interface ISuperAdmin extends Document {
  name: string;
  email: string;
  phoneNumber: string;
  password?: string;
  role?: mongoose.Types.ObjectId;
  canLoginAdmin: boolean;
  isActive: boolean;
  isDelete: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const SuperAdminSchema = new Schema<ISuperAdmin>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phoneNumber: { type: String, required: true, unique: true },
    password: { type: String },
    role: { type: Schema.Types.ObjectId, ref: "SuperAdminRole" },
    canLoginAdmin: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    isDelete: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Hash password before save
SuperAdminSchema.pre("save", async function () {
  if (!this.isModified("password") || !this.password) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

const SuperAdmin = mongoose.model<ISuperAdmin>("SuperAdmin", SuperAdminSchema);
export default SuperAdmin;
