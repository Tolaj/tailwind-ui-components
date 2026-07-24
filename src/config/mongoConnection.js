import mongoose from "mongoose";

let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    return;
  }

  if (!process.env.MONGO_URI) {
    throw new Error("Missing MONGO_URI in environment variables!");
  }

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      minPoolSize: 2,
      maxPoolSize: 10,
    });

    isConnected = conn.connections[0].readyState === 1;

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error("MongoDB Connection Error:", err.message);
    throw err;
  }
};

export default connectDB;
