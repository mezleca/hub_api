import mongoose, { Connection } from 'mongoose';

export class MongoDB {

    private static instance: MongoDB;
    private connection: Connection | null = null;

    private constructor() { }

    public static get_instance(): MongoDB {

        if (!MongoDB.instance) {
            MongoDB.instance = new MongoDB();
        }

        return MongoDB.instance;
    }

    public async connect() {

        if (this.connection) {
            return;
        }

        const url = process.env.MONGO_URL || "";

        try {
            await mongoose.connect(url);
            this.connection = mongoose.connection;
            console.log('connected to mongodb');
        } catch (error) {
            throw error;
        }
    }

    public get_connection(): Connection {

        if (!this.connection) {
            throw new Error('failed to connect to mongo');
        }

        return this.connection;
    }

    public async close() {
        if (this.connection) {
            await mongoose.disconnect();
            this.connection = null;
        }
    }
};