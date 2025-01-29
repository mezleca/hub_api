import mongoose from "mongoose";
const jwt = require("jsonwebtoken");

import { user_schema } from "../models/user";

const User = mongoose.model("User", user_schema);

export const create = async (req: Request) => {

    const payload = await req.json();
    const { username, email, password } = payload;

    if (!username || !email || !password) {
        return new Response("Invalid Payload", { status: 400 });
    }

    const user_exists = await User.findOne({ username });

    if (user_exists) {
        return new Response("User Already Exists", { status: 409 });
    }

    const hashed_password = await Bun.password.hash(password, { algorithm: "bcrypt" });
    const user = new User({ username, email, password: hashed_password });

    try {
        await user.save();
    } catch (error) {
        console.error(error);
        return new Response("Internal Server Error", { status: 500 });
    }
    
    return new Response("OK", { status: 200 });
};

export const login = async (req: Request) => {

    const payload = await req.json();
    const { username, password } = payload;

    if (!username || !password) {
        return new Response("Invalid Payload", { status: 400 });
    }

    const user = await User.findOne({ username });

    if (!user) {
        return new Response("User Not Found", { status: 404 });
    }

    const valid = await Bun.password.verify(password, user.password);

    if (!valid) {
        return new Response("Unauthorized", { status: 401 });
    }

    const token: number = jwt.sign({ user_id: user._id}, process.env.JWT_SECRET, { expiresIn: "24h" });

    return new Response("OK", { status: 200, headers: { "Authorization": token } });
}