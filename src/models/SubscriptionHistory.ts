import mongoose, { Schema, Document } from "mongoose";

export interface ISubscriptionHistory extends Document {
    restaurant: mongoose.Types.ObjectId;
    subscription: mongoose.Types.ObjectId; // Reference to the new active subscription
    action: "Assigned" | "Renewed" | "Plan Changed" | "Addon Added" | "Addon Updated" | "Cancelled" | "Expired";
    details: string;
    
    // Plan History
    previousPlan?: mongoose.Types.ObjectId;
    previousPlanName?: string;
    newPlan?: mongoose.Types.ObjectId;
    newPlanName?: string;
    
    // Addon History
    addon?: mongoose.Types.ObjectId;
    addonName?: string;
    addonQuantity?: number;

    // Financial
    amountPaid: number;

    // Audit
    performedBy?: mongoose.Types.ObjectId;
    performedByRole?: string;

    isDelete: boolean;
}

const SubscriptionHistorySchema = new Schema<ISubscriptionHistory>(
    {
        restaurant: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
        subscription: { type: Schema.Types.ObjectId, ref: "Subscription", required: true },
        action: { 
            type: String, 
            enum: ["Assigned", "Renewed", "Plan Changed", "Addon Added", "Addon Updated", "Cancelled", "Expired"], 
            required: true 
        },
        details: { type: String, required: true },
        
        previousPlan: { type: Schema.Types.ObjectId, ref: "Plan" },
        previousPlanName: { type: String },
        newPlan: { type: Schema.Types.ObjectId, ref: "Plan" },
        newPlanName: { type: String },
        
        addon: { type: Schema.Types.ObjectId, ref: "Addon" },
        addonName: { type: String },
        addonQuantity: { type: Number },

        amountPaid: { type: Number, required: true },

        performedBy: { type: Schema.Types.ObjectId, ref: "User" },
        performedByRole: { type: String },

        isDelete: { type: Boolean, default: false },
    },
    { timestamps: true }
);

const SubscriptionHistory = mongoose.model<ISubscriptionHistory>("SubscriptionHistory", SubscriptionHistorySchema);
export default SubscriptionHistory;
