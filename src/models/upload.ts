import mongoose from "mongoose";

export const video_schema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: false },
    format: { type: String, required: true },
    created_at: { type: Date, default: Date.now },
    created_by: { type: mongoose.Schema.Types.ObjectId, required: true },
    size: { type: Number, required: true },
    status: { type: String, required: true }
});