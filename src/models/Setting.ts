import mongoose, { Schema, Document } from "mongoose";

export interface ISetting extends Document {
  name: string;
  legalName: string;
  email: string;
  phone: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const settingSchema = new Schema<ISetting>(
  {
    name: { type: String, required: true },
    legalName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true }
  },
  { timestamps: true }
);

const Setting = mongoose.model<ISetting>("Setting", settingSchema);
export default Setting;
