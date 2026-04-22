import { MongoClient } from "mongodb";
import mongoose from "mongoose";
class MongoDB {
    protected mongoURI!: string;
    public db!: mongoose.Connection;
    protected options: mongoose.ConnectOptions;

    constructor(mongoURI: string) {
        this.mongoURI = mongoURI;
        this.db = mongoose.connection

        this.options = {
            serverSelectionTimeoutMS: 5000,
            autoIndex: false,
            maxPoolSize: 10,
            socketTimeoutMS: 45000,
            family: 4
        }
        if (process.env.NODE_ENV !== "production") {
            mongoose.set("debug", true)
        }
    }

    async checkDbServer() {
        try {
            const client = await MongoClient.connect(this.mongoURI);
            await client.close()
            return true;
        }
        catch (error) {
            return false
        }
    }

    async mongodbConnect() {
        try {
            await mongoose.connect(this.mongoURI, this.options);
        } catch (error) {
            console.log("MongoDB Connection Failed : ", error);
            process.exit(1);
        }
    }
}


export default MongoDB