import mongoose, { Schema, Document } from "mongoose";

export interface ISystemNotification extends Document {
  subject: string;
  type: string;
  targetType: string; // 'ALL', 'PLAN', 'RESTAURANT'
  targetPlan: mongoose.Types.ObjectId | null;
  targetRestaurants: mongoose.Types.ObjectId[];
  readByRestaurants: mongoose.Types.ObjectId[];
  body: string;
  isScheduled: boolean;
  scheduledDate: string;
  scheduledTime: string;
  status: string; // Draft, Scheduled, Sent, Cancelled
  createdAt?: Date;
  updatedAt?: Date;
}

const systemNotificationSchema = new Schema<ISystemNotification>(
  {
    subject: { type: String, required: true },
    type: { type: String, required: true },
    targetType: {
      type: String,
      enum: ['ALL', 'PLAN', 'RESTAURANT'],
      required: true
    },
    targetPlan: {
      type: Schema.Types.ObjectId,
      ref: 'Plan',
      default: null
    },
    targetRestaurants: [{ type: Schema.Types.ObjectId, ref: 'Restaurant' }],
    readByRestaurants: [{ type: Schema.Types.ObjectId, ref: 'Restaurant' }],
    body: { type: String, required: true },
    isScheduled: { type: Boolean, default: false },
    scheduledDate: { type: String, default: '' },
    scheduledTime: { type: String, default: '' },
    status: { type: String, default: 'Draft' }
  },
  { timestamps: true }
);

const SystemNotification = mongoose.model<ISystemNotification>("SystemNotification", systemNotificationSchema);
export default SystemNotification;
