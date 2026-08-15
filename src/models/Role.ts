import mongoose, { Schema, Document } from "mongoose";

interface IPermission {
  view: boolean;
  add: boolean;
  edit: boolean;
  delete: boolean;
}

export interface IRole extends Document {
  restaurantId?: mongoose.Types.ObjectId;
  type: "SUPER_ADMIN" | "RESTAURANT";
  roleName: string;
  permissions: Record<string, IPermission>;
  isDefault: boolean;
  isActive: boolean;
  isDelete: boolean;
}

const PermissionSchema = new Schema<IPermission>(
  {
    view: { type: Boolean, default: false },
    add: { type: Boolean, default: false },
    edit: { type: Boolean, default: false },
    delete: { type: Boolean, default: false },
  },
  { _id: false }
);

const RoleSchema = new Schema<IRole>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant" },
    type: { type: String, enum: ["SUPER_ADMIN", "RESTAURANT"], required: true },
    roleName: { type: String, required: true },
    permissions: { type: Map, of: PermissionSchema },
    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isDelete: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Role = mongoose.model<IRole>("Role", RoleSchema);
export default Role;
