import mongoose, { Schema, Document } from "mongoose";

interface IPermission {
  view: boolean;
  add: boolean;
  edit: boolean;
  delete: boolean;
}

export interface ISuperAdminRole extends Document {
  roleName: string;
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

const SuperAdminRoleSchema = new Schema<ISuperAdminRole>(
  {
    roleName: { type: String, required: true },
    permissions: { type: Map, of: PermissionSchema },
    isDefault: { type: Boolean, default: false },
    isDeletable: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    isDelete: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const SuperAdminRole = mongoose.model<ISuperAdminRole>("SuperAdminRole", SuperAdminRoleSchema);
export default SuperAdminRole;
