import mongoose from "mongoose";

let connecting = null;

mongoose.connection.on("disconnected", () => {
    connecting = null;
});

/**
 * Resolves once MongoDB is connected. Safe to call on every request: concurrent callers share one
 * attempt, and a failed attempt is retried by the next caller instead of crashing the process.
 */
const connectDB = () => {
    if (mongoose.connection.readyState === 1) return Promise.resolve();
    if (connecting) return connecting;

    if (!process.env.MONGO_URI) {
        return Promise.reject(new Error("Missing MONGO_URI in environment variables!"));
    }

    connecting = mongoose
        .connect(process.env.MONGO_URI, {
            minPoolSize: 1,
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 8000,
            socketTimeoutMS: 45000,
        })
        .then((conn) => {
            console.log(`MongoDB Connected: ${conn.connection.host}`);
        })
        .catch((err) => {
            connecting = null;
            console.error("MongoDB Connection Error:", err.message);
            throw err;
        });

    return connecting;
};

export default connectDB;
