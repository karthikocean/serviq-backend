import Role from "../models/Role";
import Module from "../models/Module";

export const seedRoles = async (): Promise<void> => {
  try {
    const existingRole = await Role.findOne({ roleName: "Admin" });
    if (!existingRole) {
      const allModules = await Module.find({});
      const permissions = allModules.map((mod) => ({
        module: mod._id,
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: true,
      }));

      await Role.create({
        roleName: "Admin",
        permissions,
        isActive: true,
        isDelete: false,
      });
      console.log("Seeding: Admin role seeded successfully.");
    } else {
      console.log("Seeding: Admin role already exists.");
    }
  } catch (error) {
    console.error("Role seeding error:", error);
  }
};
