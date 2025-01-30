import mongoose from "mongoose";
const jwt = require("jsonwebtoken");

import { user_schema } from "../models/user";
import { video_schema } from "../models/upload";
import { bucket } from "./upload";

const User = mongoose.model("User", user_schema);
const Video = mongoose.model("Video", video_schema);

export const get_info = async (req: Request) => {

    const username = new URL(req.url).searchParams.get("username");
    const access_token = req.headers.get("Authorization") || null;
    const is_token_valid = typeof access_token == "string" && access_token != "null"

    if (!username && !is_token_valid) {
        return new Response("Invalid Payload", { status: 400 });
    }

    // @TODO: this is confusing as hell
    const user_id = is_token_valid && !username ? jwt.verify(access_token, process.env.JWT_SECRET).user_id : 0;
    const user = user_id && !username ? await User.find({ _id: user_id }).select("username pfp") : await User.find({ username }).select("username pfp");

    // @TODO: not great
    user[0].pfp = await bucket.get_file(user[0].pfp);
    const videos = await Video.find({ created_by: user._id });

    return new Response(JSON.stringify({
        user: user[0],
        videos
    }), { status: 200 });
}; 