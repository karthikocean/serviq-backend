import { z } from "zod";

export const updateSettingsSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    tagline: z.string().optional(),
    currency: z.string().optional(),
    gstNumber: z.string().optional(),
    fssaiNumber: z.string().optional(),
    defaultTaxRate: z.number().min(0).max(100).optional(),
    openingTime: z.string().optional(),
    closingTime: z.string().optional(),
    themeColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid hex color format").optional(),
    logoUrl: z.string().url().optional(),
  }),
});
