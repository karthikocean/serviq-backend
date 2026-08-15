import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  name: string;
  email?: string;
  phoneNumber: string;
  password?: string;
  profileImage?: string;
  userType: 'RESTAURANT_OWNER' | 'BRANCH_ADMIN' | 'STAFF';
  restaurantId: mongoose.Types.ObjectId;
  branchId?: mongoose.Types.ObjectId;
  roleId?: mongoose.Types.ObjectId;
  isActive: boolean;
  isDelete: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, lowercase: true, sparse: true },
    phoneNumber: { type: String, required: true, unique: true },
    password: { type: String },
    profileImage: { type: String, default: null },
    userType: { type: String, enum: ['RESTAURANT_OWNER', 'BRANCH_ADMIN', 'STAFF'], required: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch" },
    roleId: { type: Schema.Types.ObjectId, ref: "Role" },
    isActive: { type: Boolean, default: true },
    isDelete: { type: Boolean, default: false },
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
