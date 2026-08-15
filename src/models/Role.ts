import mongoose, { Schema, Document } from "mongoose";

interface IPermission {
  module: mongoose.Types.ObjectId;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface IRole extends Document {
  restaurantId?: mongoose.Types.ObjectId;
  type: "SUPER_ADMIN" | "RESTAURANT";
  roleName: string;
  permissions: IPermission[];
  isDefault: boolean;
  isActive: boolean;
  isDelete: boolean;
}

const PermissionSchema = new Schema<IPermission>(
  {
    module: { type: Schema.Types.ObjectId, ref: "Module", required: true },
    canView: { type: Boolean, default: false },
    canCreate: { type: Boolean, default: false },
    canEdit: { type: Boolean, default: false },
    canDelete: { type: Boolean, default: false },
  },
  { _id: false }
);

const RoleSchema = new Schema<IRole>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant" },
    type: { type: String, enum: ["SUPER_ADMIN", "RESTAURANT"], required: true },
    roleName: { type: String, required: true },
    permissions: [PermissionSchema],
    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isDelete: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Role = mongoose.model<IRole>("Role", RoleSchema);
export default Role;
