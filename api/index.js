import serverless from "serverless-http";
import connectDB from "../config/mongoConnection.js";
import app from "../app.js";

let handler;

export default async function (req, res) {
    // ensure DB connected FIRST
    await connectDB();

    // create handler only once
    if (!handler) {
        handler = serverless(app);
    }

    return handler(req, res);
}