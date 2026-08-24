import { z } from "zod";

export const updateKdsItemStatusSchema = z.object({
  body: z.object({
    status: z.enum(["new", "preparing", "ready"]),
  }),
});

export const updateKdsOrderStatusSchema = z.object({
  body: z.object({
    status: z.enum(["ready", "served", "completed"]),
  }),
});
