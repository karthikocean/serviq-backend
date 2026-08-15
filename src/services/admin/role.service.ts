import Role from "../../models/Role";

export const getRolesByRestaurant = async (restaurantId: string) => {
  return await Role.find({ restaurantId, isDelete: false });
};

export const updateRolePermissions = async (roleName: string, restaurantId: string, permissions: any) => {
  const role = await Role.findOne({ roleName, restaurantId, isDelete: false });
  
  if (!role) {
    throw new Error("Role not found");
  }

  // Convert plain object to Map if necessary
  role.permissions = new Map(Object.entries(permissions)) as any;
  
  await role.save();
  return role;
};
