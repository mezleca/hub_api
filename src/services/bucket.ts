import { S3Client } from "bun";
import fs from "fs";

export const MAX_BUFFER_SIZE = 1024 * 1024 * 3; // 3MB
export const PRESIGN_CACHE = new Map<string, string>();
export class BucketService {

    private client: S3Client;
    private bucket: string;

    constructor(access_key: string, secret_key: string, name: string) {

        this.bucket = name;
    
        this.client = new S3Client({
            acl: "public-read",
            accessKeyId: access_key,
            secretAccessKey: secret_key,
            bucket: name,
            region: "us-east-1"
        });
    }

    add_file(key: string, content: ArrayBuffer) {

        try {

            const file = this.client.file(key, {
                acl: "public-read"
            });

            const writer = file.writer({
                retry: 3,
                queueSize: 5,
                partSize: MAX_BUFFER_SIZE
            });

            for (let i = 0; i < content.byteLength; i += MAX_BUFFER_SIZE) {
                writer.write(content.slice(i, i + MAX_BUFFER_SIZE));
            }

            writer.end();       
            return true;
        }
        catch(err) {
            console.error(err);
            return null;
        }
    }

    // @TODO: not great
    async get_file(key: string) {

        try {

            console.log(key);

            const file = this.client.file(key);
            const file_exist = await file.exists();

            if (!file_exist) {
                return null;
            }

            if (PRESIGN_CACHE.has(key)) {
                return PRESIGN_CACHE.get(key);
            }

            const presigned_file = file.presign({
                expiresIn: 60 * 60, // 1 hour
                acl: "public-read"
            });

            PRESIGN_CACHE.set(key, presigned_file);
            console.log(presigned_file);
            return presigned_file;
        } catch(err) {
            console.error(err);
            return null;
        }
    }
};