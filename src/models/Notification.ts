import mongoose, { Schema, Document } from "mongoose";

export interface INotification extends Document {
  restaurantId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  receiverType: "KITCHEN" | "WAITER" | "ADMIN" | "ALL";
  receiverId?: mongoose.Types.ObjectId | null;
  orderId?: mongoose.Types.ObjectId;
  tableId?: mongoose.Types.ObjectId;
  type: string;
  requestType?: string;
  title: string;
  message: string;
  isRead: boolean;
  isDelete: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true },
    receiverType: { type: String, enum: ["KITCHEN", "WAITER", "ADMIN", "ALL"], required: true },
    receiverId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    orderId: { type: Schema.Types.ObjectId, ref: "Order" },
    tableId: { type: Schema.Types.ObjectId, ref: "Table" },
    type: { type: String, required: true },
    requestType: { type: String, default: null },
    title: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    isDelete: { type: Boolean, default: false }
  },
  { timestamps: true }
);

const Notification = mongoose.model<INotification>("Notification", notificationSchema);
export default Notification;
