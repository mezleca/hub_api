import mongoose from "mongoose";

import { user_schema } from "../models/user";
import { video_schema } from "../models/upload";
import { bucket } from "./upload";

const User = mongoose.model("User", user_schema);
const Video = mongoose.model("Video", video_schema);

export const get_info = async (req: Request) => {

    const username = new URL(req.url).searchParams.get("username");

    if (!username) {
        return new Response("Missing username parameter", { status: 400 });
    }

    const user = await User.find({ username } ).select("username pfp");

    if (!user) {
        return new Response("User Not Found", { status: 404 });
    }

    // @TODO: not great
    user[0].pfp = await bucket.get_file(user[0].pfp);
    const videos = await Video.find({ created_by: user._id });

    return new Response(JSON.stringify({
        user: user[0],
        videos
    }), { status: 200 });
}; 