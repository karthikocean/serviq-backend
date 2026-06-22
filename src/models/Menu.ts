import mongoose, { Schema, Document } from "mongoose";

export interface IMenu extends Document {
    name: string;
    desc: string;
    price: number;
    category: string;
    image: string;
    available: boolean;
    veg: boolean;
    bestseller: boolean;
    isDelete: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

const menuSchema = new Schema<IMenu>(
    {
        name: { type: String, required: true },
        desc: { type: String, default: "" },
        price: { type: Number, required: true },
        category: { type: String, required: true },
        image: { type: String, default: "" },
        available: { type: Boolean, default: true },
        veg: { type: Boolean, default: true },
        bestseller: { type: Boolean, default: false },
        isDelete: { type: Boolean, default: false }
    },
    { timestamps: true }
);

const Menu = mongoose.model<IMenu>("Menu", menuSchema);
export default Menu;
