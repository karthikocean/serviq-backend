import mongoose, { Schema, Document } from "mongoose";

export interface ITicket extends Document {
  ticketNumber: string;
  restaurantId: mongoose.Types.ObjectId | null;
  restaurantName: string;
  createdBy: mongoose.Types.ObjectId | null;
  subject: string;
  category: string;
  priority: string;
  assignedUser: string;
  description: string;
  status: string;
  resolution: string;
  resolvedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const ticketSchema = new Schema<ITicket>(
  {
    ticketNumber: { type: String, required: true, unique: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', default: null }, // Optional since it could be from Lead/other
    restaurantName: { type: String, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
    subject: { type: String, required: true },
    category: { type: String, required: true },
    priority: { type: String, default: 'Medium' },
    assignedUser: { type: String, default: 'Unassigned' },
    description: { type: String, required: true },
    status: { type: String, default: 'Open' },
    resolution: { type: String, default: '' },
    resolvedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

const Ticket = mongoose.model<ITicket>("Ticket", ticketSchema);
export default Ticket;
