import mongoose, { Schema, Document } from "mongoose";

export interface INotification extends Document {
  restaurantId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  receiverType: "KITCHEN" | "WAITER";
  receiverId: mongoose.Types.ObjectId | null; // Null if it's meant for the whole KITCHEN branch
  orderId?: mongoose.Types.ObjectId;
  type: string;
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
    receiverType: { type: String, enum: ["KITCHEN", "WAITER"], required: true },
    receiverId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    orderId: { type: Schema.Types.ObjectId, ref: "Order" },
    type: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    isDelete: { type: Boolean, default: false }
  },
  { timestamps: true }
);

const Notification = mongoose.model<INotification>("Notification", notificationSchema);
export default Notification;
