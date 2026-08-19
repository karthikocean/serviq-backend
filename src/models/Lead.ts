import mongoose, { Schema, Document } from "mongoose";

export interface ILead extends Document {
  businessName: string;
  contactPerson: string;
  emailAddress: string;
  mobileNumber: string;
  leadSource: string;
  leadStatus: string;
  followUpDate: Date | null;
  assignedTo: string | null;
  remarks: string;
  convertedRestaurantId?: mongoose.Types.ObjectId | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const leadSchema = new Schema<ILead>(
  {
    businessName: { type: String, required: true },
    contactPerson: { type: String, required: true },
    emailAddress: { type: String, required: true },
    mobileNumber: { type: String, required: true },
    leadSource: { type: String, default: 'Website' },
    leadStatus: { type: String, default: 'New Lead' },
    followUpDate: { type: Date, default: null },
    assignedTo: { type: String, default: null }, // Store Name or Admin ID
    remarks: { type: String, default: '' },
    convertedRestaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', default: null }
  },
  { timestamps: true }
);

const Lead = mongoose.model<ILead>("Lead", leadSchema);
export default Lead;
