import mongoose from "mongoose";

export const user_schema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    old_usernames: { type: [String], default: [] },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    created_at: { type: Date, default: Date.now },
    pfp: { type: String, required: false },
});