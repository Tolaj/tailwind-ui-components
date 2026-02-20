import serverless from "serverless-http";
import connectDB from "../config/mongoConnection.js";
import app from "../app.js";

let server;

export default async function handler(req, res) {
    try {
        // FORCE connection first
        await connectDB();

        if (!server) {
            server = serverless(app);
        }

        return server(req, res);

    } catch (err) {
        console.error("Mongo connection failed:", err);
        res.status(500).send("Database connection failed");
    }
}