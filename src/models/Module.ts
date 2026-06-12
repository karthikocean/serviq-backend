import mongoose, { Schema, Document } from "mongoose";

export interface IModule extends Document {
  name: string;
  key: string;
  order: number;
}

const ModuleSchema = new Schema<IModule>(
  {
    name: { type: String, required: true },
    key: { type: String, required: true, unique: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Module = mongoose.model<IModule>("Module", ModuleSchema);
export default Module;
