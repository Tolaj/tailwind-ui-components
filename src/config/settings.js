import dotenv from 'dotenv';
dotenv.config();


export const mongoConfig = {
    serverUrl: process.env.MONGO_URI || "mongodb://localhost:27017/tailwind-ui-components",
    database: "tailwind-ui-components",
};


