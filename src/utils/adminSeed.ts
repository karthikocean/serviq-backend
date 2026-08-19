import bcrypt from "bcryptjs";
import Admin from "../models/Admin";
import Role from "../models/Role";

export const seedAdmin = async (): Promise<void> => {
  try {
    const adminEmail = "admin@serviq.com";
    const adminPass = "admin123"; // Changed to password for frontend login

    let superAdminRole = await Role.findOne({ type: "SUPER_ADMIN", roleName: "Super Admin" });

    if (!superAdminRole) {
      superAdminRole = await Role.create({
        roleName: "Super Admin",
        type: "SUPER_ADMIN",
        isDefault: true,
        permissions: {},
        isActive: true,
        isDelete: false,
      });
      console.log("Seeding: Super Admin Role created.");
    }

    const existingAdmin = await Admin.findOne({ email: adminEmail });

    if (!existingAdmin) {
      console.log("Seeding: Admin not found. Creating...");
      await Admin.create({
        name: "Super Admin",
        email: adminEmail,
        phoneNumber: "9988775544",
        password: adminPass,
        role: superAdminRole._id,
        canLoginAdmin: true,
        isActive: true,
        isDelete: false,
      });
      console.log("Seeding: Default admin seeded successfully.");
    } else {
      console.log("Seeding: Admin found. Checking password...");
      const isMatch = await bcrypt.compare(adminPass, existingAdmin.password!);
      if (!isMatch) {
        console.log("Seeding: Password mismatch. Updating password...");
        existingAdmin.password = adminPass;
        await existingAdmin.save();
        console.log("Seeding: Admin password updated to default.");
      } else {
        console.log("Seeding: Admin password matches.");
      }
    }
  } catch (error) {
    console.error("Admin seeding error:", error);
  }
};
