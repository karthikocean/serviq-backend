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

const RoleSchema = new Schema<IRole>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant" },
    type: { type: String, enum: ["SUPER_ADMIN", "RESTAURANT"], required: true },
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

// Compound unique index for restaurant-scoped roles
RoleSchema.index(
  { restaurantId: 1, code: 1 },
  { unique: true, partialFilterExpression: { code: { $exists: true } } }
);

const Role = mongoose.model<IRole>("Role", RoleSchema);
export default Role;
