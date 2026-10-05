import mongoose from "mongoose";
import AdminRole, { IAdminRole } from "../../models/AdminRole";
import UserRole, { IUserRole } from "../../models/UserRole";
import User from "../../models/User";
import Admin from "../../models/Admin";

export interface GetRolesParams {
  search?: string;
  status?: string;
  adminAccess?: boolean;
  page?: number;
  limit?: number;
}

const isOwnerRole = (roleName: string = ""): boolean => {
  const lower = roleName.trim().toLowerCase();
  return lower === "super admin" || lower === "super_admin" || lower === "restaurant owner" || lower === "restaurant_owner" || lower === "owner";
};

export const seedDefaultRoles = async (restaurantId: string) => {
  const restObjectId = new mongoose.Types.ObjectId(restaurantId);

  const defaultAdminRoles = [
    { code: "SUPER_ADMIN", roleName: "Super Admin", adminAccess: true, isDefault: true, isDeletable: false },
    { code: "BRANCH_ADMIN", roleName: "Branch Admin", adminAccess: true, isDefault: true, isDeletable: false },
    { code: "BRANCH_MANAGER", roleName: "Branch Manager", adminAccess: true, isDefault: true, isDeletable: false }
  ];

  const defaultUserRoles = [
    { code: "CASHIER", roleName: "Cashier", adminAccess: true, isDefault: true, isDeletable: false },
    { code: "WAITER", roleName: "Waiter", adminAccess: false, isDefault: true, isDeletable: false },
    { code: "KITCHEN_STAFF", roleName: "Kitchen Staff", adminAccess: false, isDefault: true, isDeletable: false }
  ];

  for (const dr of defaultAdminRoles) {
    await AdminRole.updateOne(
      { restaurantId: restObjectId, $or: [{ code: dr.code }, { roleName: dr.roleName }] },
      {
        $setOnInsert: {
          restaurantId: restObjectId,
          roleName: dr.roleName,
          code: dr.code,
          permissions: new Map(),
          adminAccess: dr.adminAccess,
          isAdminAccess: dr.adminAccess,
          status: "Active",
          isDefault: true,
          isDeletable: false,
          isActive: true,
          isDelete: false
        }
      },
      { upsert: true }
    );
  }

  for (const dr of defaultUserRoles) {
    await UserRole.updateOne(
      { restaurantId: restObjectId, $or: [{ code: dr.code }, { roleName: dr.roleName }] },
      {
        $setOnInsert: {
          restaurantId: restObjectId,
          roleName: dr.roleName,
          code: dr.code,
          permissions: new Map(),
          adminAccess: dr.adminAccess,
          isAdminAccess: dr.adminAccess,
          status: "Active",
          isDefault: true,
          isDeletable: false,
          isActive: true,
          isDelete: false
        }
      },
      { upsert: true }
    );
  }
};

const formatRoleResponse = (roleDoc: any, userCount: number = 0) => {
  const obj = roleDoc.toObject ? roleDoc.toObject() : roleDoc;
  if (obj.permissions) {
    obj.permissions = obj.permissions instanceof Map ? Object.fromEntries(obj.permissions) : obj.permissions;
  } else {
    obj.permissions = {};
  }
  
  const hasAdminAccess = isOwnerRole(obj.roleName)
    ? true
    : obj.adminAccess !== undefined
    ? Boolean(obj.adminAccess)
    : obj.isAdminAccess !== undefined
    ? Boolean(obj.isAdminAccess)
    : false;

  return {
    ...obj,
    adminAccess: hasAdminAccess,
    isAdminAccess: hasAdminAccess,
    status: obj.status || (obj.isActive ? "Active" : "Inactive"),
    isActive: obj.isActive !== undefined ? Boolean(obj.isActive) : true,
    assignedUsersCount: userCount
  };
};

export const getRolesByRestaurant = async (restaurantId: string, params: GetRolesParams = {}) => {
  const restObjectId = new mongoose.Types.ObjectId(restaurantId);

  // Auto-seed default system roles if none exist for restaurant
  const existingCount = (await AdminRole.countDocuments({ restaurantId: restObjectId, isDelete: false })) +
                        (await UserRole.countDocuments({ restaurantId: restObjectId, isDelete: false }));
  if (existingCount === 0) {
    await seedDefaultRoles(restaurantId);
  }

  const query: any = { restaurantId: restObjectId, isDelete: false };

  if (params.search) {
    query.$or = [
      { roleName: new RegExp(params.search, "i") },
      { code: new RegExp(params.search, "i") }
    ];
  }

  if (params.status && params.status !== "ALL" && params.status !== "All") {
    if (params.status.toLowerCase() === "active") {
      query.isActive = true;
    } else if (params.status.toLowerCase() === "inactive") {
      query.isActive = false;
    }
  }

  if (params.adminAccess !== undefined) {
    query.adminAccess = params.adminAccess;
  }

  const [adminRoles, userRoles] = await Promise.all([
    AdminRole.find(query).sort({ isDefault: -1, createdAt: 1 }),
    UserRole.find(query).sort({ isDefault: -1, createdAt: 1 })
  ]);

  const allRoles = [...adminRoles, ...userRoles];

  // Attach user counts to each role
  const formattedRoles = await Promise.all(
    allRoles.map(async (role) => {
      const userCount = await User.countDocuments({ roleId: role._id, restaurantId: restObjectId, isDelete: false }) +
                        await Admin.countDocuments({ roleId: role._id, restaurantId: restObjectId, isDelete: false });
      return formatRoleResponse(role, userCount);
    })
  );

  return formattedRoles;
};

export const getRoleById = async (roleId: string, restaurantId: string) => {
  const restObjectId = new mongoose.Types.ObjectId(restaurantId);
  let role: any = await AdminRole.findOne({ _id: roleId, restaurantId: restObjectId, isDelete: false });
  if (!role) {
    role = await UserRole.findOne({ _id: roleId, restaurantId: restObjectId, isDelete: false });
  }

  if (!role) return null;

  const userCount = await User.countDocuments({ roleId: role._id, restaurantId: restObjectId, isDelete: false }) +
                    await Admin.countDocuments({ roleId: role._id, restaurantId: restObjectId, isDelete: false });

  return formatRoleResponse(role, userCount);
};

export const createRole = async (restaurantId: string, payload: {
  roleName: string;
  permissions?: any;
  adminAccess?: boolean;
  isAdminAccess?: boolean;
  isActive?: boolean;
  status?: string;
}) => {
  const restObjectId = new mongoose.Types.ObjectId(restaurantId);
  const trimmedRoleName = payload.roleName.trim();

  // Check unique role name
  const existingAdminRole = await AdminRole.findOne({ roleName: new RegExp(`^${trimmedRoleName}$`, "i"), restaurantId: restObjectId, isDelete: false });
  const existingUserRole = await UserRole.findOne({ roleName: new RegExp(`^${trimmedRoleName}$`, "i"), restaurantId: restObjectId, isDelete: false });

  if (existingAdminRole || existingUserRole) {
    throw new Error("Role name already exists");
  }

  const isOwner = isOwnerRole(trimmedRoleName);
  const resolvedAdminAccess = isOwner ? true : (payload.adminAccess !== undefined ? payload.adminAccess : (payload.isAdminAccess !== undefined ? payload.isAdminAccess : true));
  const isActiveState = payload.isActive !== undefined ? payload.isActive : (payload.status ? payload.status === "Active" : true);
  const statusState = payload.status || (isActiveState ? "Active" : "Inactive");

  const permissionsMap = payload.permissions ? new Map(Object.entries(payload.permissions)) : new Map();

  const role = new UserRole({
    restaurantId: restObjectId,
    roleName: trimmedRoleName,
    permissions: permissionsMap,
    adminAccess: resolvedAdminAccess,
    isAdminAccess: resolvedAdminAccess,
    status: statusState,
    isDefault: false,
    isDeletable: true,
    isActive: isActiveState,
    isDelete: false
  });

  await role.save();
  return formatRoleResponse(role, 0);
};

export const updateRolePermissions = async (
  roleId: string,
  restaurantId: string,
  payload: {
    roleName?: string;
    permissions?: any;
    adminAccess?: boolean;
    isAdminAccess?: boolean;
    isActive?: boolean;
    status?: string;
  }
) => {
  const restObjectId = new mongoose.Types.ObjectId(restaurantId);

  let role: any = await AdminRole.findOne({ _id: roleId, restaurantId: restObjectId, isDelete: false });
  if (!role) {
    role = await UserRole.findOne({ _id: roleId, restaurantId: restObjectId, isDelete: false });
  }

  if (!role) {
    throw new Error("Role not found");
  }

  if (payload.roleName) {
    const trimmedRoleName = payload.roleName.trim();
    if (trimmedRoleName !== role.roleName) {
      if (role.isDefault) {
        throw new Error("Cannot rename default system roles");
      }
      const existingAdminRole = await AdminRole.findOne({ roleName: new RegExp(`^${trimmedRoleName}$`, "i"), restaurantId: restObjectId, isDelete: false });
      const existingUserRole = await UserRole.findOne({ roleName: new RegExp(`^${trimmedRoleName}$`, "i"), restaurantId: restObjectId, isDelete: false });
      if (existingAdminRole || existingUserRole) {
        throw new Error("Role name already exists");
      }
      role.roleName = trimmedRoleName;
    }
  }

  const isOwner = isOwnerRole(role.roleName);
  if (isOwner) {
    role.adminAccess = true;
    role.isAdminAccess = true;
  } else {
    if (payload.adminAccess !== undefined) {
      role.adminAccess = payload.adminAccess;
      role.isAdminAccess = payload.adminAccess;
    } else if (payload.isAdminAccess !== undefined) {
      role.adminAccess = payload.isAdminAccess;
      role.isAdminAccess = payload.isAdminAccess;
    }
  }

  if (payload.status !== undefined) {
    role.status = payload.status;
    role.isActive = payload.status === "Active";
  } else if (payload.isActive !== undefined) {
    role.isActive = payload.isActive;
    role.status = payload.isActive ? "Active" : "Inactive";
  }

  if (payload.permissions) {
    role.permissions = new Map(Object.entries(payload.permissions));
  }

  await role.save();

  const userCount = await User.countDocuments({ roleId: role._id, restaurantId: restObjectId, isDelete: false }) +
                    await Admin.countDocuments({ roleId: role._id, restaurantId: restObjectId, isDelete: false });

  return formatRoleResponse(role, userCount);
};

export const deleteRole = async (roleId: string, restaurantId: string) => {
  const restObjectId = new mongoose.Types.ObjectId(restaurantId);

  let role: any = await AdminRole.findOne({ _id: roleId, restaurantId: restObjectId, isDelete: false });
  if (!role) {
    role = await UserRole.findOne({ _id: roleId, restaurantId: restObjectId, isDelete: false });
  }

  if (!role) {
    throw new Error("Role not found");
  }

  if (role.isDefault || role.isDeletable === false) {
    throw new Error("Cannot delete default system roles");
  }

  // Check user assignment before deletion
  const assignedUsersCount = await User.countDocuments({ roleId: role._id, restaurantId: restObjectId, isDelete: false });
  const assignedAdminsCount = await Admin.countDocuments({ roleId: role._id, restaurantId: restObjectId, isDelete: false });
  const totalAssigned = assignedUsersCount + assignedAdminsCount;

  if (totalAssigned > 0) {
    throw new Error(`This role is assigned to ${totalAssigned} user(s). Reassign users before deleting the role.`);
  }

  // Soft delete
  role.isDelete = true;
  await role.save();

  return formatRoleResponse(role, 0);
};
