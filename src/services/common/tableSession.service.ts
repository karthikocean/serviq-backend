import mongoose from "mongoose";
import Table from "../../models/Table";
import { getIO } from "../../socket";

/**
 * Centralized service to safely close a table dining session
 * Clears currentGuestId, guestCreatedAt, resets status to "Available",
 * and broadcasts the update to POS / Waiter apps via Socket.io.
 */
export const closeTableDiningSession = async (
  tableId: string | mongoose.Types.ObjectId,
  reason: string = "PAYMENT_SETTLED"
) => {
  try {
    if (!tableId || !mongoose.Types.ObjectId.isValid(String(tableId))) {
      return null;
    }

    const table = await Table.findById(tableId);
    if (!table) return null;

    table.status = "Available";
    table.currentGuestId = null;
    table.guestCreatedAt = null;
    await table.save();

    // Broadcast realtime event to POS, Admin, and Waiter screens
    try {
      const io = getIO();
      if (io) {
        const payload = {
          tableId: table._id,
          tableNumber: table.tableNumber,
          status: "Available",
          currentGuestId: null,
          reason,
          timestamp: new Date()
        };

        if (table.branchId) {
          io.to(`room_branch_${table.branchId}`).emit("table_status_updated", payload);
          io.to(`room_branch_${table.branchId}`).emit("table_updated", payload);
        }
        if (table.restaurantId) {
          io.to(`room_restaurant_${table.restaurantId}`).emit("table_status_updated", payload);
        }
      }
    } catch (socketErr) {
      console.warn("Socket broadcast error in closeTableDiningSession:", socketErr);
    }

    return table;
  } catch (error) {
    console.error("Error in closeTableDiningSession:", error);
    throw error;
  }
};
