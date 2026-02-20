import dotenv from 'dotenv';
dotenv.config();


export const mongoConfig = {
    // serverUrl: process.env.MONGO_URI || "mongodb://localhost:27017/",
    serverUrl: "mongodb+srv://swapnil:xnW1rgwCZGJ6PEZP@cluster0.zh8lu.mongodb.net/tailwind-ui-components?retryWrites=true&w=majority",
    config: {
        // for mongodb atlas

        // useNewUrlParser: true,
        // useUnifiedTopology: true,
        // minPoolSize: 1,
        // maxPoolSize: 1,

        // for localhost mongodb server
        dbName: "tailwlind-ui-components",
    },
    database: "tailwlind-ui-components",
};


