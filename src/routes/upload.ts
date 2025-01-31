import mongoose from "mongoose";
const jwt = require("jsonwebtoken");

import { user_schema } from "../models/user";
import { video_schema } from "../models/upload";
import { BucketService } from "../services/bucket"

export const MAX_IMAGE_SIZE = 1024 * 1024 * 5; // 5MB
export const MAX_CHUNK_SIZE = 1024 * 1024 * 3; // 3MB
export const MAX_VIDEO_SIZE = 1024 * 1024 * 1024; // 1GB

const User = mongoose.model("User", user_schema);
const Video = mongoose.model("Video", video_schema);

const upload_task = new Map();

export const bucket = new BucketService(
    process.env.BUCKET_ACCESS_ID, 
    process.env.BUCKET_SECRET_KEY, 
    "hubshit"
);

export enum media_types {
    image = "image",
    video = "video"
}

export const VALID_MIME_TYPES = {
    [media_types.image]: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
    [media_types.video]: ['video/mp4', 'video/webm', 'video/quicktime']
};

export const check_media_type = (file: FormDataEntryValue, _type: media_types) => {

    if (!file) {
        return false;
    }

    const type = VALID_MIME_TYPES[_type];

    if (!type) {
        return false;
    }

    const file_type = file.type.split(";")[0];

    if (!type.includes(file_type)) {
        return false;
    }

    return { type: file_type, self: file, name: file.name };
};

export const pictures = async (req: Request) => {

    const content_type = req.headers.get("content-type")?.split(";");
    const access_token = req.headers.get("Authorization");

    if (!access_token) {
        console.log("no token received")
        return new Response("Unauthorized", { status: 401 });
    }

    if (!content_type?.includes("multipart/form-data")) {
        return new Response("Unsupported Media Type", { status: 415 });
    }

    try {

        const form_file = (await req.formData()).get("file");
        const file = check_media_type(form_file || "", media_types.image);

        if (!file) {
            return new Response("Unsupported Media Type", { status: 415 });
        }

        const data: ArrayBuffer = await file.self.arrayBuffer();

        if (data.byteLength > MAX_IMAGE_SIZE) {
            return new Response("payload Too Large", { status: 413 });
        }

        const user_id = mongoose.Types.ObjectId.createFromHexString(jwt.verify(access_token, process.env.JWT_SECRET).user_id);
        const user = await User.findOneAndUpdate(
            { "_id": user_id },
            { pfp: file.self.name },
            { new: true }
        );

        if (!user) {
            console.log("user not found");
            return new Response("User Not Found", { status: 404 });
        }   
        
        const result = bucket.add_file(file.self.name, data);

        if (!result) {
            return new Response("Internal Server Error", { status: 500 });
        }

        return new Response("OK", { status: 200 });
    } catch(err) {
        console.error(err);
        return new Response("Internal Server Error", { status: 500 });
    }
};

export const process_video = async (req: Request) => {

    const content_type = req.headers.get("content-type")?.split(";");
    const task_id = req.headers.get("task-id");

    if (!content_type?.includes("application/octet-stream") || !task_id) {
        return new Response("Unsupported Media Type", { status: 415 });
    }

    const task = upload_task.get(task_id);
    
    if (!task) {
        return new Response("Task not found", { status: 404 });
    }

    if (task.size >= MAX_VIDEO_SIZE) {
        upload_task.set(task_id, { ...task, status: 'failed' });
        return new Response("File too large", { status: 413 });
    }

    try {

        const chunk = await req.arrayBuffer();
        task.size +=  chunk.byteLength;
        
        if (task.size > MAX_VIDEO_SIZE) {
            upload_task.delete(task_id);
            return new Response("file too large", { status: 413 });
        }

        const result = await bucket.append_to_stream(`${task_id}.${task.format}`, chunk, task.size == task.total_size);

        // last chunk
        if (result?.finished || task.size == task.total_size) {
            upload_task.delete(task_id);
            return new Response("finished", { status: 200 });
        }

        if (!result) {
            upload_task.delete(task_id);
            return new Response("Internal Server Error", { status: 500 });
        }

        return new Response(JSON.stringify({ size: task.size }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (err) {
        console.error(`Failed to process video chunk ${task_id}:`, err);
        upload_task.set(task_id, { ...task, status: 'failed' });
        return new Response("Internal Server Error", { status: 500 });
    }
};

export const videos = async (req: Request) => {

    const access_token = req.headers.get("Authorization");

    if (!access_token) {
        return new Response("Unauthorized", { status: 401 });
    }

    const { title, description, format, total_size: size } = await req.json();

    if (!title || !size || !format)  {
        return new Response("Invalid Payload", { status: 400 });
    }

    if (size > MAX_VIDEO_SIZE) {
        return new Response("File too large", { status: 413 });
    }

    const task_id = crypto.randomUUID();
    const user_id = jwt.verify(access_token, process.env.JWT_SECRET).user_id;

    upload_task.set(task_id, {
        user_id,
        title,
        description,
        format,
        size: 0,
        total_size: size,
        status: 'pending'
    });

    try {

        const new_video = new Video({
            title,
            description,
            format,
            size,
            created_by: user_id,
            task_id,
            status: "pending"
        });

        await new_video.save();
    } catch(err) {
        console.error(err);
        upload_task.delete(task_id);
        return new Response("Internal Server Error", { status: 500 });
    }

    return new Response(JSON.stringify({ token: task_id }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
};