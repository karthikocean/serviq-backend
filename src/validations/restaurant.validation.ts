import { z } from "zod";

export const createRestaurantSchema = z.object({
  body: z.object({
    restaurantName: z.string(),
    ownerName: z.string(),
    email: z.string().email("Invalid email format"),
    phoneNumber: z.string().min(10, "Phone number must be at least 10 digits"),
    planId: z.string(),
    password: z.string().min(6, "Password must be at least 6 characters"),
    
    // New optional/required fields from UI
    websiteDomain: z.string().optional(),
    openingTime: z.string().optional(),
    closingTime: z.string().optional(),
    taxRate: z.number().optional().default(0),
    serviceFee: z.number().optional().default(0),
    bannerUrl: z.string().optional(),
    logoUrl: z.string().optional(),
    
    // Address info
    address: z.string(),
    city: z.string(),
    state: z.string(),
    country: z.string(),
    
    // Compliance info
    fssaiLicense: z.string(),
    gstinNumber: z.string(),
    panNumber: z.string(),
    
    isActive: z.boolean().optional().default(true),
    billingCycle: z.enum(["Monthly", "Annually"]).optional().default("Monthly"),
  }),
});

export const updateRestaurantSchema = z.object({
  body: z.object({
    restaurantName: z.string().optional(),
    ownerName: z.string().optional(),
    email: z.string().email("Invalid email format").optional(),
    phoneNumber: z.string().min(10).optional(),
    websiteDomain: z.string().optional(),
    openingTime: z.string().optional(),
    closingTime: z.string().optional(),
    taxRate: z.number().optional(),
    serviceFee: z.number().optional(),
    bannerUrl: z.string().optional(),
    logoUrl: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    fssaiLicense: z.string().optional(),
    gstinNumber: z.string().optional(),
    panNumber: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});
