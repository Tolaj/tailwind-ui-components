import session from 'express-session';
import dotenv from 'dotenv';
import MongoStore from "connect-mongo";
import { mongoConfig } from '../config/settings.js';

dotenv.config();

const sessionConfig = session({
    name: 'SlackOverflowSession',
    secret: process.env.SESSION_SECRET || 'change-this-secret-in-env',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: mongoConfig.serverUrl,
        dbName: mongoConfig.database,
        collectionName: "sessions",
        ttl: 60 * 60 * 2,
    }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 2,
        httpOnly: true,
    },
});

export { sessionConfig }
