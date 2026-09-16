import { z } from "zod";

export const buyAddonSchema = z.object({
  body: z.object({
    additionalSlots: z.number().int().min(1, "Must purchase at least 1 slot"),
    paymentMethod: z.enum(["Credit Card", "UPI", "NetBanking", "Cash"]),
  }),
});

export const renewPlanSchema = z.object({
  body: z.object({
    billingCycle: z.enum(["Monthly", "Annually"]).optional(),
    paymentMethod: z.string().min(1, "Payment method is required"),
    couponCode: z.string().optional()
  }),
});

export const upgradePlanSchema = z.object({
  body: z.object({
    newPlanId: z.string().min(1, "New plan ID is required"),
    billingCycle: z.enum(["Monthly", "Annually"]).optional(),
    paymentMethod: z.string().min(1, "Payment method is required")
  }),
});
