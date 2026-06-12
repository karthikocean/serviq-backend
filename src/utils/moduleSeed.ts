import Module from "../models/Module";

export const seedModules = async (): Promise<void> => {
  const modulesToSeed = [
    { name: "Dashboard", key: "dashboard" },
    { name: "User Roles", key: "user_roles" },
    { name: "Managers", key: "managers" },
    { name: "User List", key: "user_list" },
    { name: "Report", key: "report" },
    { name: "User Log", key: "user_log" },
    { name: "Support", key: "support" },
    { name: "Settings", key: "settings" },
  ];

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
