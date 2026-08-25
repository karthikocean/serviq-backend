import AdminRole from "../../models/AdminRole";
import UserRole from "../../models/UserRole";
import User from "../../models/User";
import Admin from "../../models/Admin";

export const getRolesByRestaurant = async (restaurantId: string) => {
  const adminRoles = await AdminRole.find({ restaurantId, isDelete: false });
  const userRoles = await UserRole.find({ restaurantId, isDelete: false });
  return [...adminRoles, ...userRoles];
};

export const seedDefaultRoles = async (restaurantId: string) => {
  const defaultUserRoles = [
    { code: "WAITER", roleName: "Waiter" },
    { code: "KITCHEN", roleName: "Kitchen" }
  ];

  const defaultAdminRoles = [
    { code: "BRANCH_MANAGER", roleName: "Branch Manager" }
  ];

  for (const dr of defaultUserRoles) {
    await UserRole.updateOne(
      { restaurantId, code: dr.code },
      {
        $setOnInsert: {
          restaurantId,
          roleName: dr.roleName,
          code: dr.code,
          permissions: {},
          isDefault: true,
          isDeletable: false,
          isActive: true,
          isDelete: false
        }
      },
      { upsert: true }
    );
  }

  for (const dr of defaultAdminRoles) {
    await AdminRole.updateOne(
      { restaurantId, code: dr.code },
      {
        $setOnInsert: {
          restaurantId,
          roleName: dr.roleName,
          code: dr.code,
          permissions: {},
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

export const getRoleById = async (roleId: string, restaurantId: string) => {
  const adminRole = await AdminRole.findOne({ _id: roleId, restaurantId, isDelete: false });
  if (adminRole) return adminRole;
  return await UserRole.findOne({ _id: roleId, restaurantId, isDelete: false });
};

export const createRole = async (restaurantId: string, roleName: string, permissions: any) => {
  // Check if role name already exists in either collection
  const existingAdminRole = await AdminRole.findOne({ roleName: new RegExp(`^${roleName}$`, 'i'), restaurantId, isDelete: false });
  const existingUserRole = await UserRole.findOne({ roleName: new RegExp(`^${roleName}$`, 'i'), restaurantId, isDelete: false });
  if (existingAdminRole || existingUserRole) {
    throw new Error("Role name already exists");
  }

  // By default, custom roles created via UI are UserRoles (staff roles)
  const role = new UserRole({
    restaurantId,
    roleName,
    permissions: new Map(Object.entries(permissions || {})),
    isDefault: false,
    isDeletable: true,
    isActive: true,
    isDelete: false
  });

  await role.save();
  return role;
};

export const updateRolePermissions = async (roleId: string, restaurantId: string, roleName: string, permissions: any) => {
  let role = await AdminRole.findOne({ _id: roleId, restaurantId, isDelete: false }) as any;
  if (!role) {
    role = await UserRole.findOne({ _id: roleId, restaurantId, isDelete: false });
  }
  
  if (!role) {
    throw new Error("Role not found");
  }

  if (roleName && roleName !== role.roleName) {
    if (role.isDefault) {
      throw new Error("Cannot edit default system roles directly");
    }
    const existingAdminRole = await AdminRole.findOne({ roleName: new RegExp(`^${roleName}$`, 'i'), restaurantId, isDelete: false });
    const existingUserRole = await UserRole.findOne({ roleName: new RegExp(`^${roleName}$`, 'i'), restaurantId, isDelete: false });
    if (existingAdminRole || existingUserRole) {
      throw new Error("Role name already exists");
    }
    role.roleName = roleName;
  }

  if (permissions) {
    role.permissions = new Map(Object.entries(permissions)) as any;
  }
  
  await role.save();
  return role;
};

export const deleteRole = async (roleId: string, restaurantId: string) => {
  let role = await AdminRole.findOne({ _id: roleId, restaurantId, isDelete: false }) as any;
  if (!role) {
    role = await UserRole.findOne({ _id: roleId, restaurantId, isDelete: false });
  }
  
  if (!role) {
    throw new Error("Role not found");
  }

  if (role.isDefault || !role.isDeletable) {
    throw new Error("Cannot delete default system roles");
  }

  // VALIDATION: Check if role is assigned to any active user (staff or admin)
  const assignedUsersCount = await User.countDocuments({ roleId: role._id, restaurantId, isDelete: false });
  const assignedAdminsCount = await Admin.countDocuments({ roleId: role._id, restaurantId, isDelete: false });
  
  if (assignedUsersCount + assignedAdminsCount > 0) {
    throw new Error(`This role is assigned to ${assignedUsersCount + assignedAdminsCount} user(s). Reassign users before deleting the role.`);
  }

  // Soft delete
  role.isDelete = true;
  await role.save();
  
  return role;
};
