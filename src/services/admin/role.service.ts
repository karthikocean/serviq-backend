import Role from "../../models/Role";
import User from "../../models/User";

export const getRolesByRestaurant = async (restaurantId: string) => {
  return await Role.find({ restaurantId, isDelete: false });
};

export const seedDefaultRoles = async (restaurantId: string) => {
  const defaultRoles = [
    { code: "WAITER", roleName: "Waiter" },
    { code: "KITCHEN", roleName: "Kitchen" },
    { code: "BRANCH_MANAGER", roleName: "Branch Manager" }
  ];

  for (const dr of defaultRoles) {
    await Role.updateOne(
      { restaurantId, code: dr.code },
      {
        $setOnInsert: {
          restaurantId,
          type: "RESTAURANT",
          roleName: dr.roleName,
          code: dr.code,
          permissions: {}, // Define default permissions later if needed
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
  return await Role.findOne({ _id: roleId, restaurantId, isDelete: false });
};

export const createRole = async (restaurantId: string, roleName: string, permissions: any) => {
  // Check if role name already exists for this restaurant
  const existingRole = await Role.findOne({ roleName: new RegExp(`^${roleName}$`, 'i'), restaurantId, isDelete: false });
  if (existingRole) {
    throw new Error("Role name already exists");
  }

  const role = new Role({
    restaurantId,
    type: "RESTAURANT", // Standard roles created via UI are RESTAURANT type
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
  const role = await Role.findOne({ _id: roleId, restaurantId, isDelete: false });
  
  if (!role) {
    throw new Error("Role not found");
  }

  if (roleName && roleName !== role.roleName) {
    if (role.isDefault) {
      throw new Error("Cannot edit default system roles directly");
    }
    const existingRole = await Role.findOne({ roleName: new RegExp(`^${roleName}$`, 'i'), restaurantId, isDelete: false });
    if (existingRole) {
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
  const role = await Role.findOne({ _id: roleId, restaurantId, isDelete: false });
  
  if (!role) {
    throw new Error("Role not found");
  }

  if (role.isDefault || !role.isDeletable) {
    throw new Error("Cannot delete default system roles");
  }

  // VALIDATION: Check if role is assigned to any active user
  const assignedUsersCount = await User.countDocuments({ roleId: role._id, restaurantId, isDelete: false });
  if (assignedUsersCount > 0) {
    throw new Error(`This role is assigned to ${assignedUsersCount} user(s). Reassign users before deleting the role.`);
  }

  // Soft delete
  role.isDelete = true;
  await role.save();
  
  return role;
};
