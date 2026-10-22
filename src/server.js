import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import connectDB from "./config/mongoConnection.js";

const PORT = process.env.PORT || 3000;

// A failed first attempt must not crash the process: every request retries through ensureDb in app.js.
connectDB().catch(() => {});

process.on("unhandledRejection", (reason) => {
    console.error("Unhandled rejection:", reason);
});

// Vercel runs the exported app as a serverless function; everywhere else we listen.
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

export default app;
