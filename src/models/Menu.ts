import mongoose, { Schema, Document } from "mongoose";

export interface IMenu extends Document {
    restaurantId: mongoose.Types.ObjectId;
    branchId: mongoose.Types.ObjectId;
    name: string;
    desc: string;
    price: number;
    category: mongoose.Types.ObjectId;
    image: string;
    coverImage: string;
    available: boolean;
    veg: boolean;
    gst: number;
    bestseller: boolean;
    isDelete: boolean;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

const menuSchema = new Schema<IMenu>(
    {
        restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
        branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true },
        name: { type: String, required: true },
        desc: { type: String, default: "" },
        price: { type: Number, required: true },
        category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
        image: { type: String, default: "" },
        coverImage: { type: String, default: "" },
        available: { type: Boolean, default: true },
        veg: { type: Boolean, default: true },
        gst: { type: Number, default: 0 },
        bestseller: { type: Boolean, default: false },
        isDelete: { type: Boolean, default: false },
        isActive: { type: Boolean, default: true }
    },
    { timestamps: true }
);

const Menu = mongoose.model<IMenu>("Menu", menuSchema);
export default Menu;
