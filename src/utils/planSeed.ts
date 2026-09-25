import Plan from "../models/Plan";
import Module from "../models/Module";

export const seedPlans = async (): Promise<void> => {
  try {
    // Retrieve modules to get their ObjectIds
    const modules = await Module.find({
      key: { $in: ["qr-code-config", "menu", "tables", "orders", "waiter-list", "kitchen-list", "inventory"] }
    });

    const getModuleId = (key: string) => {
      const found = modules.find((m) => m.key === key);
      return found ? found._id : null;
    };

    const qrOrdering = getModuleId("qr-code-config");
    const menuManagement = getModuleId("menu");
    const tableManagement = getModuleId("tables");
    const orderManagement = getModuleId("orders");
    const waiterManagement = getModuleId("waiter-list");
    const kitchenManagement = getModuleId("kitchen-list");
    const inventoryManagement = getModuleId("inventory");

    const defaultPlans = [
      {
        planName: "Basic Plan",
        planDescription: "Essential tools for small eateries, QR menu ordering and simple table management.",
        monthlyPrice: 999,
        monthlyDiscount: 0,
        annualPrice: 9999,
        featuresIncluded: {
            "qr-code-config": true,
            "menu": true,
            "tables": true,
            "orders": true
        },
        isActive: true,
        isDelete: false,
      },
      {
        planName: "Standard Plan",
        planDescription: "Includes everything in Basic, plus tableside waiter service and app integrations.",
        monthlyPrice: 1999,
        monthlyDiscount: 0,
        annualPrice: 19999,
        featuresIncluded: {
            "qr-code-config": true,
            "menu": true,
            "tables": true,
            "orders": true,
            "waiter-list": true
        },
        isActive: true,
        isDelete: false,
      },
      {
        planName: "Premium Plan",
        planDescription: "Advanced operations with integrated Kitchen KDS displays, advanced billing, and inventory.",
        monthlyPrice: 4999,
        monthlyDiscount: 0,
        annualPrice: 49999,
        featuresIncluded: {
            "qr-code-config": true,
            "menu": true,
            "tables": true,
            "orders": true,
            "waiter-list": true,
            "kitchen-list": true,
            "inventory": true
        },
        isActive: true,
        isDelete: false,
      },
    ];

    for (const planData of defaultPlans) {
      await Plan.findOneAndUpdate(
        { planName: planData.planName },
        { $set: planData },
        { upsert: true, returnDocument: 'after' }
      );
    }

    console.log("Subscription plans seeded successfully.");
  } catch (error) {
    console.error("Plan seeding error:", error);
  }
};
