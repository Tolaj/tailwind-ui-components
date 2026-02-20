import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import connectDB from "./config/mongoConnection.js";

const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        await connectDB(); // ✅ Wait for DB connection

        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    } catch (err) {
        console.error("❌ Failed to start server:", err.message);
        process.exit(1);
    }
};

startServer();