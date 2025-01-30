import mongoose from "mongoose";
const jwt = require("jsonwebtoken");

import { user_schema } from "../models/user";
import { BucketService } from "../services/bucket";

/*
    - video upload pseudo (preguica do caralho):
        usuario envia uma nova requisicao para /upload/video, a requisicao deve conter informacoes tipo: nome do arquivo, tamanho, tipo, etc...
        essas informacoes vao ser salva temporariamente no banco de dados, e o usuario vai receber um token.
        o token vai ser usado para fazer a verificacao do upload na rota /upload/video/:token.
        o usuario vai enviar o video em chunks, e o servidor vai ir junatando esses chunks no bucket aos poucos.
*/

export const MAX_IMAGE_SIZE = 1024 * 1024 * 5; // 5MB
export const MAX_VIDEO_SIZE = 1024 * 1024 * 1024; // 1GB obs: isso nao e pra ficar aqui, ja que o video vai ser enviado como stream

const User = mongoose.model("User", user_schema);
const upload_task = new Map();
export const bucket = new BucketService(
    process.env.BUCKET_ACCESS_ID, 
    process.env.BUCKET_SECRET_KEY, 
    "hubshit"
);

// ?
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
            { new: true } // Isso retorna o documento atualizado
        );

        /* LOGS:
        {
            acknowledged: true,
            modifiedCount: 0,  
            upsertedId: null,  
            upsertedCount: 0,  
            matchedCount: 1,   
        }
        */

        console.log(user, file.self.name);

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

const videos = async (req: Request) => {

    const content_type = req.headers.get("content-type")?.split(";");
    const access_token = req.headers.get("Authorization");

    if (!access_token) {
        console.log("no token received")
        return new Response("Unauthorized", { status: 401 });
    }
    
    if (!content_type?.includes("application/json")) {
        return new Response("Unsupported Media Type", { status: 415 });
    }

    const { title, description, format } = await req.json();

    if (!title || !format)  {
        return new Response("Invalid Payload", { status: 400 });
    }


};