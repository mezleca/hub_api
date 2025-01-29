import { BucketService } from "../services/bucket";

export const MAX_IMAGE_SIZE = 1024 * 1024 * 5; // 5MB
export const MAX_VIDEO_SIZE = 1024 * 1024 * 1024; // 1GB obs: isso nao e pra ficar aqui, ja que o video vai ser enviado como stream

const bucket = new BucketService(
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

    if (req.method !== "POST") {
        return new Response("Hey", { status: 405 });
    }

    const content_type = req.headers.get("content-type")?.split(";");

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