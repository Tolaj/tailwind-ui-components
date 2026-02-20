import connectDB from "../config/mongoConnection.js";
import app from "../app.js";

export default async function handler(req, res) {
    await connectDB(); // MUST be awaited BEFORE app()

    return new Promise((resolve, reject) => {
        app(req, res, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}