import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  name: string;
  email?: string;
  phoneNumber: string;
  password?: string;
  profileImage?: string;
  userType: 'RESTAURANT_OWNER' | 'BRANCH_ADMIN' | 'STAFF' | 'STATION';
  restaurantId: mongoose.Types.ObjectId;
  branchId?: mongoose.Types.ObjectId;
  roleId?: mongoose.Types.ObjectId;
  isActive: boolean;
  status: 'Active' | 'Inactive';
  isDelete: boolean;
  dutyStatus: 'ON_DUTY' | 'OFF_DUTY';
  kitchenPin?: string;
  autoAccept: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, lowercase: true, sparse: true },
    phoneNumber: { type: String, unique: true, sparse: true },
    password: { type: String },
    profileImage: { type: String, default: null },
    userType: { type: String, enum: ['RESTAURANT_OWNER', 'BRANCH_ADMIN', 'STAFF', 'STATION'], required: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch" },
    roleId: { type: Schema.Types.ObjectId, ref: "Role" },
    isActive: { type: Boolean, default: true },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    isDelete: { type: Boolean, default: false },
    dutyStatus: { type: String, enum: ['ON_DUTY', 'OFF_DUTY'], default: 'ON_DUTY' },
    kitchenPin: { type: String },
    autoAccept: { type: Boolean, default: false },
  },
  { timestamps: true }
);

UserSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

const User = mongoose.model<IUser>("User", UserSchema);
export default User;
