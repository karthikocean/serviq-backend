import { z } from "zod";

export const createOrderSchema = z.object({
  body: z.object({
    tableId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid table ID"),
    waiterId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid waiter ID").optional(),
    items: z.array(z.object({
      menuId: z.any(), // Allow string or object (when populated)
      name: z.string(),
      qty: z.number().min(1),
      price: z.number().min(0),
      status: z.enum(["new", "preparing", "ready", "served", "completed"]).optional(),
    })).min(1, "Order must have at least one item"),
    notes: z.string().optional(),
    subtotal: z.number().min(0),
    tax: z.number().min(0),
    charge: z.number().min(0).optional(),
    total: z.number().min(0),
  }).passthrough(),
});

export const updateOrderStatusSchema = z.object({
  body: z.object({
    status: z.enum(["new", "preparing", "ready", "served", "completed"]),
  }),
});

export const updateOrderItemsSchema = z.object({
  body: z.object({
    tableId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid table ID").optional(),
    waiterId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid waiter ID").optional(),
    notes: z.string().optional(),
    status: z.enum(["new", "preparing", "ready", "served", "completed"]).optional(),
    items: z.array(z.object({
      menuId: z.any(), // Allow string or populated object
      name: z.string(),
      qty: z.number().min(1),
      price: z.number().min(0),
      status: z.enum(["new", "preparing", "ready", "served", "completed"]).optional(),
    })).min(1),
    subtotal: z.number().min(0),
    tax: z.number().min(0),
    charge: z.number().min(0).optional(),
    total: z.number().min(0),
  }).passthrough(),
});
