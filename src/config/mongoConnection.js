// import {MongoClient} from 'mongodb';
// import {mongoConfig} from './settings.js';

// let _connection = undefined;
// let _db = undefined;

// export const dbConnection = async () => {
//   if (!_connection) {
//     _connection = await MongoClient.connect(mongoConfig.serverUrl);
//     _db = _connection.db(mongoConfig.database);
//   }

//   return _db;
// };
// export const closeConnection = async () => {
//   await _connection.close();
// };


// import mongoose from "mongoose";
// import { mongoConfig } from './settings.js';

// let isConnected = false; // Cached connection for Vercel serverless

// const connectDB = async () => {
//   // If already connected, skip re-connecting
//   if (isConnected) {
//     console.log("MongoDB already connected.");
//     return;
//   }
//   // Ensure env variable exists
//   if (!process.env.MONGO_URI || !mongoConfig.serverUrl) {
//     throw new Error("❌ Missing MONGO_URI in environment variables!");
//   }

//   try {
//     const conn = await mongoose.connect(mongoConfig.serverUrl, mongoConfig.config);

//     isConnected = conn.connections[0].readyState === 1;

//     console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

//     return true
//   } catch (err) {
//     console.error("❌ MongoDB Connection Error:", err.message);
//     throw err;
//   }
// };

// export default connectDB;

// import mongoose from "mongoose";
// import { mongoConfig } from "./settings.js";

// let isConnected = false;

// const connectDB = async () => {
//   if (isConnected) {
//     console.log("MongoDB already connected.");
//     return;
//   }

//   try {
//     const conn = await mongoose.connect(mongoConfig.serverUrl);

//     isConnected = conn.connection.readyState === 1;

//     console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
//   } catch (err) {
//     console.error("❌ MongoDB Connection Error:", err.message);
//     process.exit(1);
//   }
// };

// export default connectDB;

import mongoose from "mongoose";
import { mongoConfig } from "./settings.js";

// ✅ ADD THIS LINE (CRITICAL FIX)
mongoose.set("bufferCommands", false);

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = {
    conn: null,
    promise: null,
  };
}

async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(mongoConfig.serverUrl, {
      serverSelectionTimeoutMS: 30000,
    });
  }

  cached.conn = await cached.promise;

  console.log("✅ MongoDB connected");

  return cached.conn;
}

export default connectDB;