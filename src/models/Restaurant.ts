import mongoose, { Schema, Document } from "mongoose";

export interface IRestaurant extends Document {
    restaurantId: string; // e.g. "R-01"
    restaurantName: string;
    logoUrl?: string;
    ownerName: string;
    email: string;
    phoneNumber: string;
    websiteDomain?: string;
    openingTime?: string;
    closingTime?: string;
    bannerUrl?: string;
    address: string;
    city: string;
    state: string;
    country: string;
    fssaiLicense?: string;
    gstinNumber?: string;
    panNumber?: string;
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
        websiteDomain: { type: String },
        openingTime: { type: String },
        closingTime: { type: String },
        bannerUrl: { type: String },
        address: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        country: { type: String, required: true },
        fssaiLicense: { type: String },
        gstinNumber: { type: String },
        panNumber: { type: String },
        isActive: { type: Boolean, default: true },
        isDelete: { type: Boolean, default: false },
    },
    { timestamps: true }
);

const Restaurant = mongoose.model<IRestaurant>("Restaurant", RestaurantSchema);
export default Restaurant;

