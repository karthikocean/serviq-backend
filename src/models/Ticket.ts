import mongoose, { Schema, Document } from "mongoose";

export interface ITicket extends Document {
  ticketNumber: string;
  restaurantId: mongoose.Types.ObjectId | null;
  restaurantName: string;
  branchId?: mongoose.Types.ObjectId | null;
  branchName?: string;
  createdBy: mongoose.Types.ObjectId | null;
  createdByName?: string;
  creatorRole?: 'BRANCH_ADMIN' | 'RESTAURANT_OWNER' | 'STAFF' | 'SUPER_ADMIN' | string;
  ticketRaisedTo: 'Company Admin' | 'Super Admin';
  subject: string;
  category: string;
  priority: string;
  assignedUser: string;
  description: string;
  attachmentUrl?: string;
  status: 'Open' | 'In Progress' | 'Escalated' | 'Resolved' | 'Closed' | string;
  isEscalated: boolean;
  escalatedBy?: mongoose.Types.ObjectId | null;
  escalatedByName?: string;
  escalatedAt?: Date | null;
  escalationReason?: string;
  resolution: string;
  resolvedAt: Date | null;
  isReadBySuperAdmin?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const ticketSchema = new Schema<ITicket>(
  {
    ticketNumber: { type: String, required: true, unique: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', default: null },
    restaurantName: { type: String, required: true, default: '' },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', default: null },
    branchName: { type: String, default: '' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
    createdByName: { type: String, default: '' },
    creatorRole: { type: String, default: 'BRANCH_ADMIN' },
    ticketRaisedTo: { type: String, enum: ['Company Admin', 'Super Admin'], default: 'Company Admin' },
    subject: { type: String, required: true },
    category: { type: String, required: true },
    priority: { type: String, default: 'Medium' },
    assignedUser: { type: String, default: 'Unassigned' },
    description: { type: String, required: true },
    attachmentUrl: { type: String, default: '' },
    status: { type: String, enum: ['Open', 'In Progress', 'Escalated', 'Resolved', 'Closed'], default: 'Open' },
    isEscalated: { type: Boolean, default: false },
    escalatedBy: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
    escalatedByName: { type: String, default: '' },
    escalatedAt: { type: Date, default: null },
    escalationReason: { type: String, default: '' },
    resolution: { type: String, default: '' },
    resolvedAt: { type: Date, default: null },
    isReadBySuperAdmin: { type: Boolean, default: false }
  },
  { timestamps: true }
);

const Ticket = mongoose.model<ITicket>("Ticket", ticketSchema);
export default Ticket;
