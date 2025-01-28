import { BucketService } from "../services/bucket";

export const MAX_IMAGE_SIZE = 1024 * 1024 * 5; // 5MB

const bucket = new BucketService(
    process.env.BUCKET_ACCESS_ID, 
    process.env.BUCKET_SECRET_KEY, 
    "hubshit"
);

export const balls = async (req: Request) => {

    if (req.method !== "POST") {
        return new Response("Hey", { status: 405 });
    }

    const type = req.headers.get("content-type")?.split(";");

    if (!type?.includes("multipart/form-data")) {
        return new Response("Unsupported Media Type", { status: 415 });
    }

    try {

        const form = await req.formData();
        const file = form.get("file");

        if (!file) {
            return new Response("Bad Request", { status: 400 });
        }

        const file_type = file.type.split(";")[0];
        const file_name = file.name;

        if (file_type != "image/png" && file_type != "image/jpeg") {
            return new Response("Bad Request", { status: 400 });
        }

        const data: ArrayBuffer = await file.arrayBuffer();

        if (data.byteLength > MAX_IMAGE_SIZE) {
            return new Response("payload Too Large", { status: 413 });
        }

        const result = bucket.add_file(file_name, data);

        if (!result) {
            return new Response("Internal Server Error", { status: 500 });
        }

        return new Response("OK", { status: 200 });
    } catch(err) {
        console.error(err);
        return new Response("Internal Server Error", { status: 500 });
    }
};