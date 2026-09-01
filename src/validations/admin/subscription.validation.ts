import { z } from "zod";

export const buyAddonSchema = z.object({
  body: z.object({
    additionalSlots: z.number().int().min(1, "Must purchase at least 1 slot"),
    paymentMethod: z.enum(["Credit Card", "UPI", "NetBanking", "Cash"]),
  }),
});
