import mongoose, { Schema, Document } from "mongoose";

interface IPermission {
  view: boolean;
  add: boolean;
  edit: boolean;
  delete: boolean;
}

export interface IAdminRole extends Document {
  restaurantId: mongoose.Types.ObjectId;
  roleName: string;
  code?: string;
  roleType?: string;
  permissions: Record<string, IPermission>;
  isDefault: boolean;
  isDeletable: boolean;
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

const AdminRoleSchema = new Schema<IAdminRole>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
    roleName: { type: String, required: true },
    code: { type: String },
    roleType: { type: String },
    permissions: { type: Map, of: PermissionSchema },
    isDefault: { type: Boolean, default: false },
    isDeletable: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    isDelete: { type: Boolean, default: false },
  },
  { timestamps: true }
);

AdminRoleSchema.index(
  { restaurantId: 1, code: 1 },
  { unique: true, partialFilterExpression: { code: { $exists: true } } }
);

const AdminRole = mongoose.model<IAdminRole>("AdminRole", AdminRoleSchema);
export default AdminRole;
