import { z } from "zod";

export const createTableSchema = z.object({
  body: z.object({
    tableNumber: z.string().min(1, "Table number is required"),
    seatingCapacity: z.number().min(1, "Seating capacity must be at least 1"),
    section: z.string().optional(),
    assignedWaiter: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid waiter ID").optional().nullable(),
  }),
});

export const updateTableSchema = z.object({
  body: z.object({
    tableNumber: z.string().optional(),
    seatingCapacity: z.number().min(1).optional(),
    section: z.string().optional(),
    assignedWaiter: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid waiter ID").optional().nullable(),
    status: z.string().optional(),
    isActive: z.boolean().optional()
  }),
});

export const qrGenerationSchema = z.object({
  body: z.object({
    tableIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/)).min(1, "Provide at least one table ID"),
  }),
});
