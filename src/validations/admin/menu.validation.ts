import { z } from "zod";

export const createMenuItemSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Menu item name is required"),
    desc: z.string().optional(),
    price: z.number().min(0, "Price must be a positive number"),
    category: z.string().min(1, "Category is required"),
    gst: z.number().min(0).max(100).optional(),
    veg: z.boolean().optional(),
    available: z.boolean().optional(),
    image: z.string().optional(),
    coverImage: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const updateMenuItemSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    desc: z.string().optional(),
    price: z.number().min(0).optional(),
    category: z.string().optional(),
    gst: z.number().min(0).max(100).optional(),
    veg: z.boolean().optional(),
    available: z.boolean().optional(),
    image: z.string().optional(),
    coverImage: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const toggleMenuAvailabilitySchema = z.object({
  body: z.object({
    available: z.boolean(),
  }),
});

export const createCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1, "Category name is required"),
    description: z.string().optional(),
    status: z.string().optional()
  }),
});
