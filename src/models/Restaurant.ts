import mongoose, { Schema, Document } from "mongoose";

export interface IRestaurant extends Document {
    restaurantId: string; // e.g. "R-01"
    restaurantName: string;
    logoUrl?: string;
    ownerName: string;
    email: string;
    phoneNumber: string;
    subscriptionPlan: mongoose.Types.ObjectId; // Reference to Plan
    password?: string; // For restaurant owner login
    isActive: boolean;
    isDelete: boolean;
}

const RestaurantSchema = new Schema<IRestaurant>(
    {
        restaurantId: { type: String, required: true, unique: true },
        restaurantName: { type: String, required: true },
        logoUrl: { type: String },
        ownerName: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        phoneNumber: { type: String, required: true },
        subscriptionPlan: { type: Schema.Types.ObjectId, ref: "Plan", required: true },
        password: { type: String, required: true },
        isActive: { type: Boolean, default: true },
        isDelete: { type: Boolean, default: false },
    },
    { timestamps: true }
);

const Restaurant = mongoose.model<IRestaurant>("Restaurant", RestaurantSchema);
export default Restaurant;
