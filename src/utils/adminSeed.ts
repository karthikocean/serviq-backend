import bcrypt from "bcryptjs";
import SuperAdmin from "../models/SuperAdmin";
import SuperAdminRole from "../models/SuperAdminRole";

export const seedAdmin = async (): Promise<void> => {
  try {
    const adminEmail = "admin@serviq.com";
    const adminPass = "admin123"; 

    let superAdminRole = await SuperAdminRole.findOne({ roleName: "Super Admin" });

    if (!superAdminRole) {
      superAdminRole = await SuperAdminRole.create({
        roleName: "Super Admin",
        isDefault: true,
        permissions: {},
        isActive: true,
        isDelete: false,
      });
      console.log("Seeding: Super Admin Role created.");
    }

    const existingAdmin = await SuperAdmin.findOne({ email: adminEmail });

    if (!existingAdmin) {
      console.log("Seeding: Admin not found. Creating...");
      await SuperAdmin.create({
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
    await SuperAdmin.updateMany({ canLoginAdmin: { $ne: true } }, { $set: { canLoginAdmin: true } });
    console.log("Seeding: Checked and updated all SuperAdmins' login permissions.");
  } catch (error) {
    console.error("Admin seeding error:", error);
  }
};
