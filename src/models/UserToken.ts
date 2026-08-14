import mongoose, { Schema, Document } from "mongoose";

export interface IUserToken extends Document {
  userId: mongoose.Types.ObjectId;
  token: string;
  createdAt: Date;
}

const UserTokenSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true },
  token: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: '7d' }, // Automatically remove document after 7 days
});

export default mongoose.model<IUserToken>("UserToken", UserTokenSchema);
