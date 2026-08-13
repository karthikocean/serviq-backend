import Module from "../models/Module";

export const seedModules = async (): Promise<void> => {
  const modulesToSeed: { name: string; key: string; type: "SUPER_ADMIN" | "RESTAURANT" }[] = [
    { name: "Dashboard Overview", key: "overview", type: "RESTAURANT" },
    { name: "Incoming Orders", key: "orders", type: "RESTAURANT" },
    { name: "Menu Management", key: "menu", type: "RESTAURANT" },
    { name: "Billing & Settlement", key: "billing", type: "RESTAURANT" },
    { name: "QR Management", key: "qr-code-config", type: "RESTAURANT" },
    { name: "Dining Tables", key: "tables", type: "RESTAURANT" },
    { name: "Waiter Management", key: "waiter-list", type: "RESTAURANT" },
    { name: "Kitchen Management", key: "kitchen-list", type: "RESTAURANT" },
    { name: "Business Reports & Analytics", key: "reports", type: "RESTAURANT" },
    { name: "Roles & Permissions", key: "roles-permissions", type: "RESTAURANT" },
    { name: "User Management", key: "users", type: "RESTAURANT" },
    { name: "Store Configurations", key: "settings", type: "RESTAURANT" },
  ];

  try {
    const seedKeys = modulesToSeed.map((m) => m.key);
    await Module.deleteMany({ key: { $nin: seedKeys } });

    for (let i = 0; i < modulesToSeed.length; i++) {
      const mod = modulesToSeed[i];
      await Module.findOneAndUpdate(
        { key: mod.key },
        { $set: { ...mod, order: i + 1 } },
        { upsert: true, returnDocument: 'after' }
      );
    }
    console.log("Modules seeded successfully.");
  } catch (error) {
    console.error("Module seeding error:", error);
  }
};
