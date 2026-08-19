import mongoose, { Schema, Document } from "mongoose";

export interface ICategory extends Document {
    restaurantId: mongoose.Types.ObjectId;
    branchId: mongoose.Types.ObjectId;
    name: string;
    description: string;
    status: string;
}

const categorySchema = new Schema<ICategory>(
    {
        restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
        branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true },
        name: { type: String, required: true },
        description: { type: String, default: "" },
        status: { type: String, default: "AVAILABLE" }
    },
    { timestamps: true }
);

// Compound index for uniqueness of category per branch
categorySchema.index({ branchId: 1, name: 1 }, { unique: true });

const Category = mongoose.model<ICategory>("Category", categorySchema);
export default Category;
