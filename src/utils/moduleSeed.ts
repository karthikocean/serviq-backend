import Module from "../models/Module";

export const seedModules = async (): Promise<void> => {
  const modulesToSeed = [
    { name: "Dashboard Overview", key: "overview", plan: false },
    { name: "Incoming Orders", key: "orders", plan: true },
    { name: "Menu Management", key: "menu", plan: true },
    { name: "Billing & Settlement", key: "billing", plan: false },
    { name: "QR Management", key: "qr-code-config", plan: true },
    { name: "Dining Tables", key: "tables", plan: true },
    { name: "Waiter Management", key: "waiter-list", plan: true },
    { name: "Kitchen Management", key: "kitchen-list", plan: true },
    { name: "Business Reports & Analytics", key: "reports", plan: false },
    { name: "Roles & Permissions", key: "roles-permissions", plan: false },
    { name: "User Management", key: "users", plan: false },
    { name: "Store Configurations", key: "settings", plan: false },
  ];;

  try {
    const seedKeys = modulesToSeed.map((m) => m.key);
    await Module.deleteMany({ key: { $nin: seedKeys } });

    for (let i = 0; i < modulesToSeed.length; i++) {
      const mod = modulesToSeed[i];
      await Module.findOneAndUpdate(
        { key: mod.key },
        { $set: { ...mod, order: i + 1 } },
        { upsert: true, new: true }
      );
    }
    console.log("Modules seeded successfully.");
  } catch (error) {
    console.error("Module seeding error:", error);
  }
};
