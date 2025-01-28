import { S3Client } from "bun";

export const MAX_BUFFER_SIZE = 1024 * 1024 * 3; // 3MB
export class BucketService {

    client: S3Client;

    constructor(access_key: string, secret_key: string, name: string) {
        
        this.client = new S3Client({
            accessKeyId: access_key,
            secretAccessKey: secret_key,
            bucket: name,
            region: "us-east-1"
        });
    }

    get_file(key: string) {

        const content = this.client.file(key);

        if (!content) {
            return null;
        }

        return content;
    }

    add_file(key: string, content: ArrayBuffer) {

        try {

            const file = this.client.file(key);
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
};