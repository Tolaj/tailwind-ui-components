import connectDB from "../config/mongoConnection.js";
import app from "../app.js";

export default async function handler(req, res) {
    try {
        await connectDB();
        return app(req, res);
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
}