import bcrypt from "bcryptjs";
import Admin from "../models/Admin";
import Role from "../models/Role";

export const seedAdmin = async (): Promise<void> => {
  try {
    const adminPhone = "9988775544";
    const adminPass = "serviq@2026";

    const existingAdmin = await Admin.findOne({ phoneNumber: adminPhone });
    const adminRole = await Role.findOne({ roleName: "Admin" });

    if (!adminRole) {
      console.error("Seeding Error: Admin role not found. Seed roles first.");
      return;
    }

    if (!existingAdmin) {
      console.log("Seeding: Admin not found. Creating...");
      await Admin.create({
        name: "Super Admin",
        email: "admin@serviq.com",
        phoneNumber: adminPhone,
        password: adminPass,
        role: adminRole._id,
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
