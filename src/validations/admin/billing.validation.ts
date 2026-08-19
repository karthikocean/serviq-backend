import { z } from "zod";

export const applyDiscountSchema = z.object({
  body: z.object({
    discount: z.number().min(0, "Discount cannot be negative"),
  }),
});

export const processPaymentSchema = z.object({
  body: z.object({
    paymentMethod: z.enum(["cash", "card", "upi"]),
  }),
});
