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


import mongoose from "mongoose";
import { mongoConfig } from './settings.js';

let isConnected = false; // Cached connection for Vercel serverless

const connectDB = async () => {
  // If already connected, skip re-connecting
  if (isConnected) {
    console.log("MongoDB already connected.");
    return;
  }
  // Ensure env variable exists
  if (!process.env.MONGO_URI || !mongoConfig.serverUrl) {
    throw new Error("❌ Missing MONGO_URI in environment variables!");
  }

  try {
    const conn = await mongoose.connect(mongoConfig.serverUrl, mongoConfig.config);

    isConnected = conn.connections[0].readyState === 1;

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    return true
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err.message);
    throw err;
  }
};

export default connectDB;