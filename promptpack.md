# PromptPack Output

**Root:** `/Users/swapnil/Documents/Projects/tailwind-ui-components`
**Generated:** 2026-02-18T01:35:30.173Z

---

## 1) Folder Structure

```txt
.
├─ package.json
├─ promptpack.md
├─ README.md
└─ src/
   ├─ app.js
   ├─ config/
   │  ├─ mongoCollections.js
   │  ├─ mongoConnection.js
   │  └─ settings.js
   ├─ controllers/
   │  ├─ component.controller.js
   │  └─ user.controller.js
   ├─ middlewares/
   │  ├─ auth.js
   │  ├─ lastSeen.js
   │  ├─ methodOverride.js
   │  ├─ requestLogger.js
   │  └─ sessionConfig.js
   ├─ models/
   │  ├─ component.model.js
   │  └─ user.model.js
   ├─ processes/
   │  ├─ generateOTP.js
   │  └─ sendEmail.js
   ├─ public/
   │  ├─ css/
   │  │  ├─ ag-grid.css
   │  │  ├─ quill.css
   │  │  └─ style.css
   │  └─ js/
   │     ├─ auth.js
   │     ├─ category.js
   │     ├─ home.js
   │     ├─ tailwind.config.js
   │     ├─ theme.js
   │     └─ utils.js
   ├─ routes/
   │  ├─ auth.routes.js
   │  ├─ component.routes.js
   │  ├─ home.routes.js
   │  ├─ index.js
   │  └─ user.routes.js
   ├─ server.js
   ├─ services/
   │  └─ user.service.js
   ├─ utils/
   │  └─ handlebars-helpers.js
   └─ views/
      ├─ auth/
      │  ├─ signin.handlebars
      │  ├─ signup.handlebars
      │  └─ verification.handlebars
      ├─ error.handlebars
      ├─ layouts/
      │  ├─ auth.handlebars
      │  └─ main.handlebars
      ├─ main/
      │  ├─ category-detail.handlebars
      │  └─ home.handlebars
      └─ partials/
         ├─ component-editor-modal.handlebars
         ├─ component-playground.handlebars
         ├─ navbar.handlebars
         └─ sidebar.handlebars
```

<!-- PAGE BREAK: FILE CONTENTS BELOW -->

## 2) File Contents


### package.json

```json
{
  "name": "nodejs_express_handlebars_boilerplate",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1",
    "dev": "nodemon src/server.js",
    "test-email": "node test-email.js",
    "start": "node --env-file=.env src/server.js"
  },
  "keywords": [],
  "author": "Swapnil Jadhav",
  "license": "ISC",
  "type": "module",
  "dependencies": {
    "connect-mongo": "^6.0.0",
    "dotenv": "^17.2.3",
    "express": "^5.2.1",
    "express-handlebars": "^8.0.4",
    "express-session": "^1.18.2",
    "mongodb": "^7.0.0",
    "mongoose": "^9.0.2"
  },
  "devDependencies": {
    "eslint": "^9.39.2",
    "nodemon": "^3.1.11",
    "prettier": "^3.7.4"
  }
}

```

### promptpack.md

```markdown
# PromptPack Output

**Root:** `/Users/swapnil/Documents/Projects/tailwind-ui-components`
**Generated:** 2026-02-16T22:21:33.811Z

---

## 1) Folder Structure

```txt
.
├─ package.json
├─ README.md
└─ src/
   ├─ app.js
   ├─ config/
   │  ├─ mongoCollections.js
   │  ├─ mongoConnection.js
   │  └─ settings.js
   ├─ controllers/
   │  ├─ component.controller.js
   │  └─ user.controller.js
   ├─ middlewares/
   │  ├─ auth.js
   │  ├─ lastSeen.js
   │  ├─ methodOverride.js
   │  ├─ requestLogger.js
   │  └─ sessionConfig.js
   ├─ models/
   │  ├─ component.model.js
   │  └─ user.model.js
   ├─ processes/
   │  ├─ generateOTP.js
   │  └─ sendEmail.js
   ├─ public/
   │  ├─ css/
   │  │  ├─ ag-grid.css
   │  │  ├─ quill.css
   │  │  └─ style.css
   │  └─ js/
   │     ├─ auth.js
   │     ├─ home.js
   │     ├─ tailwind.config.js
   │     ├─ theme.js
   │     └─ utils.js
   ├─ routes/
   │  ├─ auth.routes.js
   │  ├─ component.routes.js
   │  ├─ home.routes.js
   │  ├─ index.js
   │  └─ user.routes.js
   ├─ server.js
   ├─ services/
   │  └─ user.service.js
   ├─ utils/
   │  └─ handlebars-helpers.js
   └─ views/
      ├─ auth/
      │  ├─ signin.handlebars
      │  ├─ signup.handlebars
      │  └─ verification.handlebars
      ├─ error.handlebars
      ├─ layouts/
      │  ├─ auth.handlebars
      │  └─ main.handlebars
      ├─ main/
      │  ├─ category-detail.handlebars
      │  └─ home.handlebars
      └─ partials/
         ├─ component-editor-modal.handlebars
         ├─ navbar.handlebars
         └─ sidebar.handlebars
```

<!-- PAGE BREAK: FILE CONTENTS BELOW -->

## 2) File Contents


### package.json

```json
{
  "name": "nodejs_express_handlebars_boilerplate",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1",
    "dev": "nodemon src/server.js",
    "test-email": "node test-email.js",
    "start": "node --env-file=.env src/server.js"
  },
  "keywords": [],
  "author": "Swapnil Jadhav",
  "license": "ISC",
  "type": "module",
  "dependencies": {
    "connect-mongo": "^6.0.0",
    "dotenv": "^17.2.3",
    "express": "^5.2.1",
    "express-handlebars": "^8.0.4",
    "express-session": "^1.18.2",
    "mongodb": "^7.0.0",
    "mongoose": "^9.0.2"
  },
  "devDependencies": {
    "eslint": "^9.39.2",
    "nodemon": "^3.1.11",
    "prettier": "^3.7.4"
  }
}

```

### README.md

```markdown


```

### src/app.js

```javascript
import express from "express";
import configRoutes from "./routes/index.js";
import handlebars from "express-handlebars";
import path from "path";
import { fileURLToPath } from "url";

import { requestLogger } from "./middlewares/requestLogger.js";
import { sessionConfig } from "./middlewares/sessionConfig.js";
import { setSessionLocals } from "./middlewares/auth.js";
import lastSeenMiddleware from "./middlewares/lastSeen.js";
import { formatDate, substring } from './utils/handlebars-helpers.js';

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// middlewares
app.use("/public", express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sessionConfig);
app.use(lastSeenMiddleware);

// handlebars setup
app.use(setSessionLocals);
app.use(requestLogger);
app.engine(
    "handlebars",
    handlebars.engine({
        defaultLayout: "main",
        helpers: {
            eq: (a, b) => a === b,
            notEq: (a, b) => a !== b,
            eqStr: (a, b) => String(a) === String(b),
            or: (a, b) => a || b,
            and: (a, b) => a && b,
            not: (a) => !a,
            json: (obj) => JSON.stringify(obj),
            formatDate: formatDate,
            substring: substring
        },
        partialsDir: [path.join(__dirname, "views/partials/")]
    })
);
app.set("view engine", "handlebars");
app.set("views", path.join(__dirname, "views"));

configRoutes(app);


export default app;

```

### src/config/mongoCollections.js

```javascript
// import { dbConnection } from "./mongoConnection.js";

// const getCollectionFn = (collection) => {
//     let _col = undefined;

//     return async () => {
//         if (!_col) {
//             const db = await dbConnection();
//             _col = await db.collection(collection);
//         }

//         return _col;
//     };
// };

// export const questions = getCollectionFn("questions");
// export const users = getCollectionFn("users");
// export const courses = getCollectionFn("courses");
// export const answers = getCollectionFn("answers");
// export const sessions = getCollectionFn("sessions");

```

### src/config/mongoConnection.js

```javascript
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

```

### src/config/settings.js

```javascript
import dotenv from 'dotenv';
dotenv.config();


export const mongoConfig = {
    serverUrl: process.env.MONGO_URI || "mongodb://localhost:27017/",
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



```

### src/controllers/component.controller.js

```javascript
import Component from "../models/component.model.js";

// Get all components
export const getAllComponents = async (req, res) => {
    try {
        const { category } = req.query;

        let query = { isPublished: true };

        if (category) {
            query.category = category;
        }

        const components = await Component.find(query)
            .populate('createdBy', 'name email')
            .sort('-createdAt');

        res.status(200).json({
            success: true,
            data: components
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get single component
export const getComponentById = async (req, res) => {
    try {
        const component = await Component.findById(req.params.id)
            .populate('createdBy', 'name email');

        if (!component) {
            return res.status(404).json({
                success: false,
                message: 'Component not found'
            });
        }

        // Increment views
        component.views += 1;
        await component.save();

        res.status(200).json({
            success: true,
            data: component
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Create component
export const createComponent = async (req, res) => {
    try {
        const { title, category, description, htmlCode, elementsDescription } = req.body;  // ✅ Added elementsDescription

        if (!title || !category || !description || !htmlCode) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields'
            });
        }

        const component = await Component.create({
            title,
            category,
            description,
            htmlCode,
            elementsDescription: elementsDescription || [],  // ✅ Added this
            createdBy: req.session.user.id
        });

        res.status(201).json({
            success: true,
            message: 'Component created successfully',
            data: component
        });
    } catch (error) {
        console.error('Create component error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Update component
export const updateComponent = async (req, res) => {
    try {
        const component = await Component.findById(req.params.id);

        if (!component) {
            return res.status(404).json({
                success: false,
                message: 'Component not found'
            });
        }

        if (component.createdBy.toString() !== req.session.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }

        // Allow updating elementsDescription too
        const { title, category, description, htmlCode, elementsDescription, isPublished } = req.body;

        const updateData = {};
        if (title) updateData.title = title;
        if (category) updateData.category = category;
        if (description) updateData.description = description;
        if (htmlCode) updateData.htmlCode = htmlCode;
        if (elementsDescription) updateData.elementsDescription = elementsDescription;  // ✅ Added this
        if (typeof isPublished !== 'undefined') updateData.isPublished = isPublished;

        const updated = await Component.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        res.status(200).json({
            success: true,
            data: updated
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Delete component
export const deleteComponent = async (req, res) => {
    try {
        const component = await Component.findById(req.params.id);

        if (!component) {
            return res.status(404).json({
                success: false,
                message: 'Component not found'
            });
        }

        // ✅ Changed to .id instead of ._id
        if (component.createdBy.toString() !== req.session.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }

        await Component.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Component deleted'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Like component
export const toggleLike = async (req, res) => {
    try {
        const component = await Component.findById(req.params.id);

        if (!component) {
            return res.status(404).json({
                success: false,
                message: 'Component not found'
            });
        }

        component.likes += 1;
        await component.save();

        res.status(200).json({
            success: true,
            likes: component.likes
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

```

### src/controllers/user.controller.js

```javascript
import * as userService from "../services/user.service.js";

export const createUser = async (req, res) => {
    try {
        const user = await userService.createUser(req.body);
        res.status(201).json(user);
    } catch (error) {
        res.status(404).json(error);
    }
};

export const getUsers = async (req, res) => {
    const users = await userService.getAllUsers();
    res.json(users);
};

export const userSignIn = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        const user = await userService.getUserByEmail(email);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Remove sensitive fields
        const { password, ...userData } = user.toObject();

        req.session.user = {
            id: userData._id,
            last_name: userData.name,
            email: userData.email,
        };

        return res.status(200).json({ message: "Sign-in successful!", userData: userData });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};


```

### src/middlewares/auth.js

```javascript
const ensureAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect("/auth/sign-in");
    }
    next();
};

const redirectIfAuthenticated = (req, res, next) => {
    if (req.session.user && req.originalUrl !== "/auth/sign-out") {
        return res.redirect("/");
    }
    next();
};

const noCacheAuth = (req, res, next) => {
    res.set(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, private, max-age=0"
    );
    res.set("Pragma", "no-cache");
    res.set("Expires", "-1");
    next();
};

const ensureProfessor = (req, res, next) => {
    if (!req.session.user || req.session.user.role !== "professor") {
        return res.status(403).send("Access denied");
    }
    next();
};

const setSessionLocals = (req, res, next) => {
    res.locals.user = req.session?.user || null;
    next();
};

const ensureAuthAPI = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({
            success: false,
            message: 'Please login to continue'
        });
    }
    next();
};

export {
    ensureAuth,
    ensureAuthAPI,
    ensureProfessor,
    setSessionLocals,
    redirectIfAuthenticated,
    noCacheAuth,
};

```

### src/middlewares/lastSeen.js

```javascript
const lastSeenMiddleware = (req, res, next) => {
    if (req.session && req.session.user) {
        req.session.lastSeen = Date.now();
    }
    next();
};

export default lastSeenMiddleware;

```

### src/middlewares/methodOverride.js

```javascript
const methodOverride = (req, res, next) => {

    if (req.body && req.body._method) {
        req.method = req.body._method.toUpperCase();
        delete req.body._method;
    }
    next();
};

export { methodOverride }

```

### src/middlewares/requestLogger.js

```javascript
/**
 * Logs every request with timestamp, method, path and auth status.
 */
const requestLogger = (req, res, next) => {
    const timestamp = new Date().toUTCString();
    let authStatus = "Non-Authenticated";

    if (req.session && req.session.user) {
        const role =
            req.session.user.role === "professor" ? "professor" : "student";
        authStatus = `Authenticated ${role}`;
    }

    console.log(
        `[${timestamp}]: ${req.method} ${req.originalUrl} (${authStatus})`
    );

    next();
};

export { requestLogger };

```

### src/middlewares/sessionConfig.js

```javascript
import session from 'express-session';
import dotenv from 'dotenv';
import MongoStore from "connect-mongo";
import { mongoConfig } from '../config/settings.js';

dotenv.config();

const sessionConfig = session({
    name: 'SlackOverflowSession',
    secret: process.env.SESSION_SECRET || 'team18-secret-key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: mongoConfig.serverUrl,
        dbName: mongoConfig.database,
        collectionName: "sessions",
        ttl: 60 * 60 * 24 * 2,
    }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 2,
    },
});

export { sessionConfig }

```

### src/models/component.model.js

```javascript
import mongoose from "mongoose";

const componentSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true
        },
        category: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true,
            trim: true
        },
        htmlCode: {
            type: String,
            required: true
        },
        elementsDescription: {  // ✅ Added this field
            type: [mongoose.Schema.Types.Mixed],
            default: []
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        views: {
            type: Number,
            default: 0
        },
        likes: {
            type: Number,
            default: 0
        },
        isPublished: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

export default mongoose.model("Component", componentSchema);

```

### src/models/user.model.js

```javascript
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        name: { type: String },
        email: { type: String, require: true },
        password: { type: String },
    },
    { timestamps: true }
);

export default mongoose.model("User", userSchema);

```

### src/processes/generateOTP.js

```javascript
import * as validator from "../utils/validator.js";
import sendEmail from "./sendEmail.js";
// TODO: Create one for the students also!!!!!!

import { fileURLToPath } from "url";
import fs from "fs/promises";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const renderTemplateLiteral = (template, vars) => {
    // Evaluates `template` as a JS template literal with vars in scope.
    // Only use with trusted templates.
    const fn = new Function(...Object.keys(vars), `return \`${template}\`;`);
    return fn(...Object.values(vars));
};

/**
 * Generate a random number between 100,000 (inclusive) and 999,999 (inclusive)
 * @returns
 */
const generateRandomSixDigitNumber = () => {
    return Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;
};

export const sendOTPEmail = async (email) => {
    email = validator.isValidEmail(email);
    const temp_name = email.split("@")[0];
    const otp = generateRandomSixDigitNumber();
    const filePath = path.resolve(__dirname, "../public/htmls/otpMailer.html");
    let html = await fs.readFile(filePath, "utf-8");
    html = renderTemplateLiteral(html, { otp, name: temp_name });
    await sendEmail(
        email,
        "SlackOverflow OTP confirmation",
        `Good day ${temp_name}! \nPlease use the below OTP to authenticate yourself to the website.`,
        html
    );
    return otp;
};

```

### src/processes/sendEmail.js

```javascript
import "dotenv/config";
import * as nodemailer from "nodemailer";
import { google } from "googleapis";

const GMAIL_ID = (process.env.GMAIL_ID || "").trim();
const CLIENT_ID = (process.env.EMAIL_CLIENT_ID || "").trim();
const CLIENT_SECRET = (process.env.EMAIL_CLIENT_SECRET || "").trim();
const REFRESH_TOKEN = (process.env.EMAIL_REFRESH_TOKEN || "").trim();

if (!GMAIL_ID || !CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    throw new Error(
        `Missing envs: ${JSON.stringify({
            GMAIL_ID: !!GMAIL_ID,
            CLIENT_ID: !!CLIENT_ID,
            CLIENT_SECRET: !!CLIENT_SECRET,
            REFRESH_TOKEN: !!REFRESH_TOKEN,
        })}`
    );
}

const oAuth2 = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
oAuth2.setCredentials({ refresh_token: REFRESH_TOKEN });

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        type: "OAuth2",
        user: GMAIL_ID,
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        refreshToken: REFRESH_TOKEN, // must be minted with scope https://mail.google.com/
    },
});

/**
 * Send an email to the receiver using nodemailer
 * @param {*} to
 * @param {*} subject
 * @param {*} text
 * @param {*} html
 */
const sendEmail = async (to, subject, text, html) => {
    try {
        const { token: accessToken } = await oAuth2.getAccessToken();

        const info = await transporter.sendMail({
            from: `"SlackOverflow" <${GMAIL_ID}>`,
            to,
            subject,
            text: text || "Hello from SlackOverflow mailer.",
            html: html || "<p>Hello from SlackOverflow mailer.</p>",
            envelope: { from: GMAIL_ID, to }, // align SMTP MAIL FROM / RCPT TO
            dsn: {
                id: String(Date.now()),
                return: "headers",
                notify: ["failure", "delay"],
                recipient: to,
            },
            headers: { "X-Entity-Ref-ID": String(Date.now()) },
            auth: {
                user: GMAIL_ID,
                accessToken, // explicit fresh access token
                refreshToken: REFRESH_TOKEN,
            },
        });

        console.log(
            "Message sent:",
            info.messageId,
            "accepted:",
            info.accepted,
            "rejected:",
            info.rejected
        );
        return info;
    } catch (err) {
        console.error("sendEmail failed:", err?.response?.data || err);
        throw err;
    }
};

export default sendEmail;

```

### src/public/css/ag-grid.css

```css
.ag-theme-alpine {
    --ag-header-foreground-color: black;
    --ag-header-background-color: rgba(240, 124, 0, 0);
    --ag-border-color: transparent;
    --ag-row-border: 2px solid var(--primary);
    --ag-background-color: white;
    --ag-row-hover-color: white;
    --ag-input-border: 2px solid var(--primary);
}

.ag-theme-alpine .ag-header-cell-resize {
    background-color: var(--primary);
    width: 2px;
    height: 15px;
    right: 0;
    top: 31%;
    bottom: 20%;
    opacity: 1;
}

.ag-theme-alpine .ag-paging-panel {
    border: 2px solid rgb(236, 233, 233);
    border-right: none;
    border-bottom: none;
    border-left: none;
    border-radius: 0;
    padding: 4px;
}



.ag-checkbox-input-wrapper.ag-checked {
    background-color: var(--primary) !important;

    border-color: var(--primary) !important;
}

.ag-checkbox-input-wrapper:focus-within {
    border-color: var(--primary);
    box-shadow: 0 0 0 2px var(--primary);
}

.ag-checkbox-input-wrapper:focus-within .ag-icon-checkbox-checked,
.ag-checkbox-input-wrapper:focus-within .ag-icon-checkbox-unchecked {
    color: var(--primary);
}

```

### src/public/css/quill.css

```css


/* Inner editable area (default for all editors) */
#updateAnswerEditor .ql-editor,
#updateQuestionEditor .ql-editor,
#questionEditor .ql-editor,
#answerEditor .ql-editor {
    max-height: 400px;
    overflow-y: auto;
    font-size: 16px;
    padding-top: 2px;
    padding-bottom: 2px;
}

/* Placeholder styling */
.ql-editor.ql-blank::before {
    color: #9ca3af;
    font-style: normal;
}

/* Remove default borders so it blends with your card */
.ql-toolbar.ql-snow,
.ql-container.ql-snow {
    border: none;
}

/* Icon + picker color */
.ql-snow .ql-stroke {
    stroke: #4b5563;
}

.ql-snow .ql-fill {
    fill: #4b5563;
}

.ql-snow .ql-picker-label,
.ql-snow .ql-picker-item {
    color: #4b5563;
}

/* Open pickers upwards so they don't get cut off */
.ql-snow .ql-picker.ql-expanded .ql-picker-options {
    bottom: 100%;
    top: auto;
    margin-bottom: 4px;
}

/* Tooltip (link / video dialog) */
.ql-tooltip {
    z-index: 1000;
    left: 8px !important;
    transform: none !important;
}

/* Nicer tooltip look */
.ql-snow .ql-tooltip {
    border-radius: 0.5rem;
    box-shadow: 0 10px 25px rgba(15, 23, 42, 0.12);
    border-color: #e5e7eb;
    font-size: 0.875rem;
}

.ql-snow .ql-tooltip button {
    border-radius: 9999px;
    padding: 0.2rem 0.6rem;
}

.ql-snow .ql-tooltip button.ql-action {
    background-color: #f0bd66;
    color: #ffffff;
    border-color: transparent;
}

.ql-snow .ql-tooltip button.ql-remove {
    color: #6b7280;
    border-color: #e5e7eb;
}

/* Let JS control the height; just enforce a sane minimum */
#questionEditor {
    min-height: 60px;
}

/* Inner editor fills that box and scrolls */
#questionEditor .ql-editor {
    height: 100%;
    max-height: 100%;
    overflow-y: auto;
}

```

### src/public/css/style.css

```css
/* Remove AG Grid blue focus/selection outline in Course Management grid */
#courseManagementGrid .ag-cell-focus,
#courseManagementGrid .ag-cell-range-single-cell,
#courseManagementGrid .ag-cell:focus {
  outline: none !important;
  border: none !important;
}

#studentManagementGrid .ag-cell-focus,
#studentManagementGrid .ag-cell-range-single-cell,
#studentManagementGrid .ag-cell:focus {
  outline: none !important;
  border: none !important;
}

:root {
  --primary: #000000;
  --secondary: #e0e0e0;
  --tertiary: #ffffff;
}

```

### src/public/js/auth.js

```javascript
const handleSignIn = (event) => {
    event.preventDefault();
    const email = event.target.email.value.trim();
    const password = event.target.password.value.trim();

    const button = event.target.querySelector("button[type='submit']");
    button.disabled = true;
    button.innerText = "Signing in...";

    fetch("/users/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    })
        .then(async (res) => {
            const body = await res.json();
            return { status: res.status, body };
        })
        .then(({ status, body }) => {
            if (status !== 200) {
                showToast(body.message || "unknown error.", "error");
                button.disabled = false;
                button.innerText = "Sign In";
                return;
            }

            showToast("Login successful! Redirecting...", "success");

            setTimeout(() => {
                window.location.href = "/";
            }, 1200);
        })
        .catch((err) => {
            console.error("handleSignIn error:", err);
            showToast("Server error. Please try again.", "error");
            button.disabled = false;
            button.innerText = "Sign In";
        });

    return false;
};

const handleSignUp = (event) => {
    event.preventDefault();

    const form = event.target;
    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value.trim();
    const confirmPassword = form.confirmPassword.value.trim();

    // front-end confirm password check
    if (!password || !confirmPassword) {
        showToast("Password and Confirm Password are required.", "error");
        return false;
    }

    if (password !== confirmPassword) {
        showToast("Passwords do not match.", "error");
        return false;
    }

    const button = form.querySelector("button[type='submit']");
    button.disabled = true;
    button.innerText = "Signing up...";

    fetch("/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
    })
        .then(async (res) => {
            const body = await res.json();
            return { status: res.status, body };
        })
        .then(({ status, body }) => {
            if (status !== 200 && status !== 201) {

                const message =
                    body?.message === "user not found"
                        ? "User not found"
                        : body?.message || body?.errorResponse?.errmsg;

                showToast(message, "error");
                button.disabled = false;
                button.innerText = "Sign Up";
                return;
            }


            showToast("Signup successful!", "success");
            button.disabled = false;
            button.innerText = "Sign Up";

            setTimeout(() => {
                window.location.href = "/auth/sign-in";
            }, 800);
        })
        .catch((err) => {
            console.error("handleSignUp error:", err);
            showToast("Server error. Please try again.", "error");
            button.disabled = false;
            button.innerText = "Sign Up";
        });

    return false;
};

const handleVerification = (event) => {
    event.preventDefault();

    const otpInputs = document.querySelectorAll(".otp-input");
    const otp = Number(
        Array.from(otpInputs)
            .map((i) => i.value.trim())
            .join("")
    );

    const email = localStorage.getItem("otpEmail");
    const button = event.target.querySelector("button[type='submit']");
    console.log(otp);
    if (!otp || otp.length < 4) {
        showToast("Please enter the full 6-digit OTP.", "error");
        return;
    }

    button.disabled = true;
    button.innerText = "Verifying...";

    fetch("/users/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
    })
        .then(async (res) => {
            const body = await res.json();
            return { status: res.status, body };
        })
        .then(({ status, body }) => {
            if (status !== 200) {
                showToast(body.message || "Invalid or expired OTP.", "error");
                button.disabled = false;
                button.innerText = "Verify Account";
                return;
            }

            localStorage.removeItem("otpEmail");

            showToast("Verification successful! Redirecting...", "success");

            setTimeout(() => {
                window.location.href = "/auth/sign-in";
            }, 1200);
        })
        .catch((err) => {
            console.error("handleVerification error:", err);
            showToast("Server error. Please try again.", "error");
            button.disabled = false;
            button.innerText = "Verify Account";
        });

    return false;
};

```

### src/public/js/home.js

```javascript

function updatePreview() {
    const html = document.getElementById('htmlEditor').value;
    const preview = document.getElementById('preview');
    const previewDoc = preview.contentDocument || preview.contentWindow.document;

    previewDoc.open();
    previewDoc.write(html);
    previewDoc.close();
}

const clearEditor = () => {
    if (confirm('Clear all content?')) {
        document.getElementById('htmlEditor').value = '';
        document.getElementById('preview').innerHTML = '';
    }
}

const createDescriptionFromElement = (element) => {
    const getAttributes = (element) => {
        const attrs = {};
        Array.from(element.attributes || []).forEach(attr => {
            attrs[attr.name] = attr.value;
        });
        return attrs;
    };

    const getNodeKind = (element) => {
        if (element.tagName === "BUTTON") return "action";
        if (element.tagName === "SVG" || element.tagName === "PATH") return "icon";
        if (element.localName.includes("-")) return "component";
        return "layout";
    };

    const description = {
        type: "element",
        tag: element.localName,
        kind: getNodeKind(element),
        attributes: getAttributes(element),
        classList: Array.from(element.classList),
        children: [],
    };

    // 🔥 PRESERVE ORDER (TEXT + ELEMENTS)
    element.childNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            if (node.textContent.trim()) {
                description.children.push({
                    type: "text",
                    content: node.textContent,
                });
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            description.children.push(createDescriptionFromElement(node));
        }
    });

    return description;
};



const createElementFromDescription = (
    description,
    isDraggable = false
) => {

    if (description.type === "text") {
        return document.createTextNode(description.content);
    }

    const SVG_TAGS = new Set(["svg", "path", "circle", "rect", "line", "g"]);

    const createElement = (tag) => {
        if (SVG_TAGS.has(tag)) {
            return document.createElementNS("http://www.w3.org/2000/svg", tag);
        }
        return document.createElement(tag);
    };

    const element = createElement(description.tag);

    /* classes */
    if (description.classList?.length) {
        element.classList.add(...description.classList);
    }

    /* attributes */
    Object.entries(description.attributes || {}).forEach(([k, v]) => {
        element.setAttribute(k, v);
    });

    /* draggable */
    if (isDraggable) {
        element.setAttribute("draggable", "true");
    }

    /* 🔥 PRESERVE ORDER */
    description.children?.forEach(child => {
        element.appendChild(
            createElementFromDescription(child, isDraggable)
        );
    });

    return element;
};




const handleChangeEditor = (e) => {
    const preview = document.getElementById("preview");

    // Clear previous content

    preview.innerHTML = ""

    const parser = new DOMParser();
    const dom = parser.parseFromString(e.target.value, "text/html");

    const elementsDescription = Array.from(dom.body.children).map(child =>
        createDescriptionFromElement(child)
    );
    console.log(elementsDescription)
    elementsDescription.forEach(description => {
        const element = createElementFromDescription(description, true);
        preview.appendChild(element);
    });
};



function makePreviewZoomable(previewId, options = {}) {
    const preview = document.getElementById(previewId);
    const previewParentId = document.getElementById("preview-wrapper");

    let zoom = 1;
    let position = { x: 0, y: 0 };
    let isDragging = false;
    let dragStart = { x: 0, y: 0 };
    let activeTool = options.activeTool || "HAND";

    preview.style.transformOrigin = "0 0";
    preview.style.cursor = "grab";

    function updateTransform() {
        preview.style.transform =
            `translate(${position.x}px, ${position.y}px) scale(${zoom})`;
    }

    function zoomAtPoint(newZoom, clientX, clientY) {
        const rect = preview.getBoundingClientRect();

        const mouseX = clientX - rect.left;
        const mouseY = clientY - rect.top;

        const scaleFactor = newZoom / zoom;

        position.x -= mouseX * (scaleFactor - 1);
        position.y -= mouseY * (scaleFactor - 1);

        zoom = newZoom;
        updateTransform();
    }

    function handleWheel(e) {
        e.preventDefault();

        if (e.ctrlKey || e.metaKey) {
            const delta = e.deltaY < 0 ? 1.1 : 0.9;
            const newZoom = Math.max(0.02, Math.min(10, zoom * delta));

            zoomAtPoint(newZoom, e.clientX, e.clientY);
        } else {
            position.x -= e.deltaX;
            position.y -= e.deltaY;
            updateTransform();
        }
    }

    function handleMouseDown(e) {
        if (activeTool === "HAND") {
            isDragging = true;
            dragStart = {
                x: e.clientX - position.x,
                y: e.clientY - position.y,
            };
            preview.style.cursor = "grabbing";
        }
    }

    function handleMouseMove(e) {
        if (!isDragging) return;
        position.x = e.clientX - dragStart.x;
        position.y = e.clientY - dragStart.y;
        updateTransform();
    }

    function handleMouseUp() {
        if (activeTool === "HAND") {
            isDragging = false;
            preview.style.cursor = "grab";
        }
    }

    function handleKeyDown(e) {
        if ((e.ctrlKey || e.metaKey) && (e.key === "=" || e.key === "-")) {
            e.preventDefault();
            const delta = e.key === "=" ? 1.1 : 0.9;
            const newZoom = Math.max(0.02, Math.min(10, zoom * delta));

            zoomAtPoint(newZoom, window.innerWidth / 2, window.innerHeight / 2);
        }
    }

    preview.addEventListener("wheel", handleWheel, { passive: false });
    previewParentId.addEventListener("wheel", handleWheel, { passive: false });
    preview.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("keydown", handleKeyDown);

    return {
        setZoom: (value, cx = 0, cy = 0) => zoomAtPoint(value, cx, cy),
        setPosition: (x, y) => {
            position = { x, y };
            updateTransform();
        },
        getZoom: () => zoom,
        getPosition: () => ({ ...position }),
        setActiveTool: (tool) => {
            activeTool = tool;
            preview.style.cursor = tool === "HAND" ? "grab" : "default";
        }
    };
}


const previewController = makePreviewZoomable("preview");

// programmatically zoom to 150%
previewController.setZoom(0.5);

// programmatically pan
previewController.setPosition(0, 0);

const handleMovement = () => {
    const movementButton = document.getElementById("movementButton")
    const movementButton2 = document.getElementById("movementButton2")
    const preview = document.getElementById("preview");
    const styleId = "previewPointerStyle";
    const existingStyle = document.getElementById(styleId);

    if (existingStyle) {
        // Remove if exists
        existingStyle.remove();
        movementButton.classList.remove("bg-slate-200")
        movementButton.classList.add("text-white")
        movementButton2.classList.remove("bg-slate-200")
        movementButton2.classList.add("text-white")
        previewController.setActiveTool("SELECT");

    } else {
        movementButton.classList.add("bg-slate-200")
        movementButton.classList.remove("text-white")
        movementButton2.classList.add("bg-slate-200")
        movementButton2.classList.remove("text-white")
        // Add if not exists
        const style = document.createElement("style");
        style.id = styleId;
        style.textContent = `
            #preview:hover * {
                pointer-events: none;
            }
        `;
        document.head.appendChild(style);
        previewController.setActiveTool("HAND");
    }

}

const handleDisplaySize = (e) => {
    const preview = document.querySelector('#preview');

    // Remove all width classes that start with "w-"
    preview.classList.forEach(cls => {
        if (cls.startsWith('w-')) {
            preview.classList.remove(cls);
        }
    });

    if (e.target.checked === false) {
        preview.classList.add('w-fit');

    } else {
        preview.classList.add('w-screen');
    }

}

document.addEventListener("fullscreenchange", () => {
    const FSTools = document.getElementById("fullScreenTools");

    if (!document.fullscreenElement) {
        // Exited fullscreen (ESC or programmatic)
        FSTools.classList.add("hidden");
    } else {
        // Entered fullscreen
        FSTools.classList.remove("hidden");
    }
});

const togglePreviewFullscreen = () => {
    const wrapper = document.getElementById("preview-wrapper");

    if (!document.fullscreenElement) {
        wrapper.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
};


let isDetailsOpen = false;

const handleNext = () => {

    const componentForm = document.getElementById("componentForm");
    const htmlEditor = document.getElementById("htmlEditor");
    const details = document.getElementById("detailsPanel");
    const cancelBtn = document.getElementById("cancelBtn");
    const nextBtn = document.getElementById("nextBtn");
    const backBtn = document.getElementById("backBtn");
    const submitBtn = document.getElementById("submitBtn");

    if (!componentForm.htmlEditor.checkValidity()) {
        componentForm.htmlEditor.reportValidity();
        return;
    }

    details.classList.remove("hidden");
    cancelBtn.classList.add("hidden")
    backBtn.classList.remove("hidden");
    nextBtn.classList.add("hidden")
    submitBtn.classList.remove("hidden")

}

const handleBack = () => {
    const details = document.getElementById("detailsPanel");
    const cancelBtn = document.getElementById("cancelBtn");
    const nextBtn = document.getElementById("nextBtn");
    const backBtn = document.getElementById("backBtn");
    const submitBtn = document.getElementById("submitBtn");

    details.classList.add("hidden");
    cancelBtn.classList.remove("hidden")
    backBtn.classList.add("hidden");
    nextBtn.classList.remove("hidden")
    submitBtn.classList.add("hidden")
}

const handleClose = () => {
    const dialog = document.getElementById("dialog");
    document.getElementById('htmlEditor').value = '';
    document.getElementById('preview').innerHTML = '';
    dialog.close()
}


const handleSave = async (e) => {
    e.preventDefault();

    const form = e.target;
    const submitBtn = document.getElementById("submitBtn");

    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    // Get html editor value
    const htmlCode = document.getElementById('htmlEditor').value;

    const parser = new DOMParser();
    const dom = parser.parseFromString(htmlCode, "text/html");

    const elementsDescription = Array.from(dom.body.children).map(child =>
        createDescriptionFromElement(child)
    );

    // ✅ Get all form fields automatically
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // Add extra values
    data.htmlCode = htmlCode;
    data.elementsDescription = elementsDescription;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    try {
        const response = await fetch('/api/components', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message);
        }

        alert('Component saved successfully!');
        handleClose();
        window.location.reload();

    } catch (error) {
        console.error('Save error:', error);
        alert(error.message || 'Failed to save component');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit';
    }
};



```

### src/public/js/tailwind.config.js

```javascript
tailwind.config = {
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                primary: "var(--primary)",
                secondary: 'var(--secondary)',
                tertiary: 'var(--tertiary)',

            },
        },
    },
};

```

### src/public/js/theme.js

```javascript
const applyCustomTheme = () => {
    const primary = document.getElementById('primaryColor').value;
    const secondary = document.getElementById('secondaryColor').value;
    const tertiary = document.getElementById('tertiaryColor').value;


    document.documentElement.style.setProperty('--primary', primary);
    document.documentElement.style.setProperty('--secondary', secondary);
    document.documentElement.style.setProperty('--tertiary', tertiary);
}

const handleThemeToggle = () => {
    themeDropdown = document.getElementById("themeDropdown");

    const isClosed = themeDropdown.classList.contains("hidden");

    if (isClosed) {
        themeDropdown.classList.remove(
            'hidden',
            "pointer-events-none"
        );
    } else {
        themeDropdown.classList.add(
            "hidden",
            "pointer-events-none"
        );
    }
}

```

### src/public/js/utils.js

```javascript
const showToast = (message, type = "info") => {
  const authToast = document.getElementById("auth-toast");
  const toast = document.createElement("div");
  toast.className =
    "px-5 py-3 rounded-lg shadow-md text-white text-sm flex items-center justify-between gap-4 animate-slide-in";

  if (type === "success") toast.classList.add("bg-green-500");
  else if (type === "error") toast.classList.add("bg-red-500");
  else toast.classList.add("bg-gray-700");

  toast.innerHTML = `
    <span>${message}</span>
    <button class="text-white text-lg leading-none focus:outline-none" onclick="this.parentElement.remove()">×</button>
  `;

  authToast.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("animate-slide-out");
    setTimeout(() => toast.remove(), 300);
  }, 20000);
}

const style = document.createElement("style");
style.textContent = `
  @keyframes slideIn {
    from { opacity: 0; transform: translateX(100%); }
    to { opacity: 1; transform: translateX(0); }
  }
  @keyframes slideOut {
    from { opacity: 1; transform: translateX(0); }
    to { opacity: 0; transform: translateX(100%); }
  }
  .animate-slide-in {
    animation: slideIn 0.4s ease forwards;
  }
  .animate-slide-out {
    animation: slideOut 0.3s ease forwards;
  }
`;

document.head.appendChild(style);

```

### src/routes/auth.routes.js

```javascript
import { Router } from "express";

const router = Router();

router.get("/sign-in", (req, res) => {
    return res.render("auth/signin", { layout: 'auth', title: 'Sign In' });
});

// Sign Out
router.get('/sign-out', (req, res) => {
    return req.session.destroy(() => {
        res.clearCookie('SlackOverflowSession');
        res.redirect('/auth/sign-in');
    });
});

// Sign Up
router.get("/sign-up", (req, res) => {
    return res.render("auth/signup", { layout: 'auth', title: "Sign Up" });
});

// OTP Verification
router.get("/verify-otp", (req, res) => {
    return res.render("auth/verification", { layout: 'auth', title: "OTP Verification" });
});

export default router;

```

### src/routes/component.routes.js

```javascript
import express from "express";
import {
    getAllComponents,
    getComponentById,
    createComponent,
    updateComponent,
    deleteComponent,
    toggleLike
} from "../controllers/component.controller.js";
import { ensureAuthAPI } from "../middlewares/auth.js";  // Changed import

const router = express.Router();

// Public routes
router.get("/", getAllComponents);
router.get("/:id", getComponentById);

// Protected routes - using ensureAuthAPI instead of ensureAuth
router.post("/", ensureAuthAPI, createComponent);
router.put("/:id", ensureAuthAPI, updateComponent);
router.delete("/:id", ensureAuthAPI, deleteComponent);
router.post("/:id/like", ensureAuthAPI, toggleLike);

export default router;

```

### src/routes/home.routes.js

```javascript
import express from "express";
import Component from "../models/component.model.js";

const router = express.Router();

// Category definitions with display names
const categories = {
    'marketing-hero': { name: 'Hero Sections', group: 'Marketing' },
    'marketing-hero-forms': { name: 'Hero Forms', group: 'Marketing' },
    'marketing-icons': { name: 'Icon Sections', group: 'Marketing' },
    'marketing-pricing': { name: 'Pricing Sections', group: 'Marketing' },
    'marketing-faq': { name: 'FAQ Sections', group: 'Marketing' },
    'marketing-blog': { name: 'Blog Sections', group: 'Marketing' },
    'marketing-testimonials': { name: 'Testimonials', group: 'Marketing' },
    'marketing-team': { name: 'Team Sections', group: 'Marketing' },
    'marketing-features': { name: 'Features', group: 'Marketing' },
    'marketing-announcements': { name: 'Announcement Banners', group: 'Marketing' },
    'marketing-cards': { name: 'Card Sections', group: 'Marketing' },
    'marketing-clients': { name: 'Clients Sections', group: 'Marketing' },
    'marketing-galleries': { name: 'Galleries', group: 'Marketing' },
    'marketing-timeline': { name: 'Timeline', group: 'Marketing' },
    'ui-dropdowns': { name: 'Dropdowns', group: 'UI Components' },
    'ui-selects': { name: 'Selects', group: 'UI Components' },
    'ui-buttons': { name: 'Button Groups', group: 'UI Components' },
    'ui-modals': { name: 'Modals', group: 'UI Components' },
    'ui-cookie-banners': { name: 'Cookie Banners', group: 'UI Components' },
    'navigation-navbars': { name: 'Navbars / Headers', group: 'Navigation' },
    'navigation-mega-menu': { name: 'Mega Menu', group: 'Navigation' },
    'layout-basic': { name: 'Layouts', group: 'Layout' },
    'forms-authentication': { name: 'Authentication', group: 'Forms' },
    'forms-feedback': { name: 'Feedback', group: 'Forms' },
    'forms-subscribe': { name: 'Subscribe', group: 'Forms' },
    'forms-textarea': { name: 'Textarea Inputs', group: 'Forms' },
    'pages-pricing': { name: 'Pricing Page', group: 'Pages' },
    'ecommerce-products': { name: 'Product Listings', group: 'E-Commerce' },
    'apps-general': { name: 'Application Components', group: 'Applications' },
    'apps-invoice': { name: 'Invoice', group: 'Applications' },
    'apps-tables': { name: 'Tables', group: 'Applications' },
    'apps-stats': { name: 'Stats', group: 'Applications' },
    'apps-charts': { name: 'Charts', group: 'Applications' },
    'apps-ai-prompt': { name: 'AI Prompt', group: 'Applications' },
    'footer-contact': { name: 'Contact Sections', group: 'Footer' },
    'footer-footers': { name: 'Footers', group: 'Footer' }
};

// Home page - Shows only categories that have components
router.get("/", async (req, res) => {
    try {
        const components = await Component.find({ isPublished: true }).lean();

        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        const categoryCounts = {};
        const categoryNewCounts = {};

        components.forEach(component => {
            const cat = component.category;
            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

            if (new Date(component.createdAt) >= oneMonthAgo) {
                categoryNewCounts[cat] = (categoryNewCounts[cat] || 0) + 1;
            }
        });

        const categoryCards = Object.keys(categoryCounts)
            .filter(key => categoryCounts[key] > 0)
            .map(key => ({
                slug: key,
                name: categories[key]?.name || key,
                group: categories[key]?.group || 'Other',
                count: categoryCounts[key],
                newCount: categoryNewCounts[key] || 0,
                hasNew: categoryNewCounts[key] > 0
            }));

        res.status(200).render("main/home", {
            layout: 'main',
            title: 'Tailwind UI Components',
            user: req.session.user || null,
            categories: categoryCards,
            totalComponents: components.length  // ✅ Add total count
        });
    } catch (error) {
        console.error('Error loading home page:', error);
        res.status(500).render("error", {
            layout: "main",
            title: "Error",
            message: "Failed to load components",
        });
    }
});

// Category detail page - Shows components in that category
router.get("/category/:category", async (req, res) => {
    try {
        const { category } = req.params;

        // Get all components for counts
        const allComponents = await Component.find({ isPublished: true }).lean();

        // Get category counts for sidebar
        const categoryCounts = {};
        allComponents.forEach(component => {
            categoryCounts[component.category] = (categoryCounts[component.category] || 0) + 1;
        });

        // Build sidebar categories list
        const allCategories = Object.keys(categoryCounts)
            .filter(key => categoryCounts[key] > 0)
            .map(key => ({
                slug: key,
                name: categories[key]?.name || key,
                count: categoryCounts[key],
                isActive: key === category
            }));

        // Get components for current category
        const components = await Component.find({
            category: category,
            isPublished: true
        })
            .populate('createdBy', 'name email last_name')
            .sort('-createdAt')
            .lean();

        const categoryInfo = categories[category];

        if (!categoryInfo) {
            return res.status(404).render("error", {
                layout: "main",
                title: "Category Not Found",
                message: "The category you're looking for doesn't exist.",
            });
        }

        // Mark which components are new
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        components.forEach(component => {
            component.isNew = new Date(component.createdAt) >= oneMonthAgo;
        });

        res.status(200).render("main/category-detail", {
            layout: 'main',
            title: categoryInfo.name,
            user: req.session.user || null,
            components: components,
            categoryName: categoryInfo.name,
            categorySlug: category,
            allCategories: allCategories
        });
    } catch (error) {
        console.error('Error loading category:', error);
        res.status(500).render("error", {
            layout: "main",
            title: "Error",
            message: "Failed to load category",
        });
    }
});

// Component detail page
router.get("/component/:id", async (req, res) => {
    try {
        const component = await Component.findById(req.params.id)
            .populate('createdBy', 'name email last_name');

        if (!component) {
            return res.status(404).render("error", {
                layout: "main",
                title: "Component Not Found",
                message: "The component you're looking for doesn't exist.",
            });
        }

        component.views += 1;
        await component.save();

        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        component.isNew = new Date(component.createdAt) >= oneMonthAgo;

        res.status(200).render("main/component-detail", {
            layout: 'main',
            title: component.title,
            user: req.session.user || null,
            component: component
        });
    } catch (error) {
        console.error('Error loading component:', error);
        res.status(500).render("error", {
            layout: "main",
            title: "Error",
            message: "Failed to load component",
        });
    }
});

export default router;

```

### src/routes/index.js

```javascript
import usersRoutes from "./user.routes.js";
import authRoutes from "./auth.routes.js";
import componentRoutes from "./component.routes.js";
import homeRoutes from "./home.routes.js";

import {
    ensureAuth,
    redirectIfAuthenticated,
    noCacheAuth,
} from "../middlewares/auth.js";

const constructorMethod = (app) => {
    app.use("/users", usersRoutes);
    app.use("/auth", redirectIfAuthenticated, noCacheAuth, authRoutes)
    app.use("/api/components", componentRoutes);


    // Home page
    app.use("/", homeRoutes);


    // Add this temporary debug route to your routes/index.js
    app.get("/api/debug/session", ensureAuth, (req, res) => {
        res.json({
            fullSession: req.session,
            user: req.session.user,
            userId: req.session.user?._id,
            userKeys: Object.keys(req.session.user || {})
        });
    });

    app.use("/{*splat}", (req, res) => {
        res.status(404).render("error", {
            layout: "auth",
            title: "Page Not Found",
            message: "The page you requested could not be found.",
        });
    });
};
export default constructorMethod;

```

### src/routes/user.routes.js

```javascript
import { Router } from "express";
import { getUsers, createUser, userSignIn } from "../controllers/user.controller.js";

const router = Router();

router.route("/").get(getUsers).post(createUser)

router.route("/sign-in").post(userSignIn)



export default router;

```

### src/server.js

```javascript
import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import connectDB from "./config/mongoConnection.js";

const PORT = process.env.PORT || 3000;

connectDB();

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

```

### src/services/user.service.js

```javascript
import User from "../models/user.model.js";

/* CREATE */
export const createUser = async (data) => {
    return await User.create(data);
};

/* READ */
export const getAllUsers = async () => {
    return await User.find();
};

export const getUserByEmail = async (email) => {
    return User.findOne({ email });
};

export const getUserById = async (id) => {
    return await User.findById(id);
};

/* UPDATE */
export const updateUser = async (id, data) => {
    return await User.findByIdAndUpdate(id, data, { new: true });
};

/* DELETE */
export const deleteUser = async (id) => {
    return await User.findByIdAndDelete(id);
};

```

### src/utils/handlebars-helpers.js

```javascript
export const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};

export const substring = (str, start, end) => {
    if (!str) return '';
    return str.substring(start, end).toUpperCase();
};

```

### src/views/auth/signin.handlebars

```
<div class="w-full max-w-2xl px-5 mx-auto">
  <div class="bg-white rounded-xl shadow-md p-12 px-20">
    <h1 class="text-3xl font-semibold text-gray-900 text-center mb-3">Sign In</h1>
    <p class="text-gray-400 text-center mb-10">Sign in below to access your account</p>

    <!-- Home Button -->
    <div class="text-center mb-6">
      <a 
        href="/"
        class="inline-block px-5 py-2.5 text-sm font-medium text-[#F0BD66] border border-[#F0BD66] rounded-lg 
               hover:bg-[#F0BD66] hover:text-white transition-colors duration-200"
      >
        Go to Home
      </a>
    </div>

    <div id="toast" class="hidden mb-6 p-4 rounded-lg text-sm"></div>

    <form class="space-y-4" onsubmit="handleSignIn(event)">
      <div>
        <input 
          type="email" 
          name="email" 
          placeholder="Email Address"
          class="w-full px-4 py-3.5 text-gray-900 placeholder-gray-300 bg-white border-b-2 border-gray-200 
                 focus:border-amber-500 focus:outline-none transition-colors"
          required
        >
      </div>

      <div>
        <input 
          type="password" 
          name="password" 
          placeholder="Password"
          class="w-full px-4 py-3.5 text-gray-900 placeholder-gray-300 bg-white border-b-2 border-gray-200 
                 focus:border-amber-500 focus:outline-none transition-colors"
          required
        >
      </div>

      <button 
        type="submit"
        class="w-full mt-6 py-4 text-white font-medium bg-[#F0BD66] rounded-lg 
               hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
      >
        Sign in
      </button>

      <p class="text-center text-sm text-gray-400 mt-6">
        Don't have an account yet?
        <a href="/auth/sign-up" class="text-[#F0BD66] font-medium hover:text-amber-600 transition-colors">
          Sign up
        </a>
      </p>
    </form>
  </div>
</div>

```

### src/views/auth/signup.handlebars

```
<div class="w-full max-w-2xl px-5 mx-auto">
  <div class="bg-white rounded-xl shadow-md p-12 px-20">
    <h1 class="text-3xl font-semibold text-gray-900 text-center mb-3">Sign Up</h1>
    <p class="text-gray-400 text-center mb-10">Sign up below to create a new account</p>

    <!-- Home Button -->
    <div class="text-center mb-6">
      <a href="/" class="inline-block px-5 py-2.5 text-sm font-medium text-[#F0BD66] border border-[#F0BD66] rounded-lg 
               hover:bg-[#F0BD66] hover:text-white transition-colors duration-200">
        Go to Home
      </a>
    </div>

    <div id="toast" class="hidden mb-6 p-4 rounded-lg text-sm"></div>

    <form class="space-y-4" onsubmit="handleSignUp(event)">
      <div>
        <input type="text" name="name" placeholder="John Doe" class="w-full px-4 py-3.5 text-gray-900 placeholder-gray-300 bg-white border-b-2 border-gray-200 
                 focus:border-amber-500 focus:outline-none transition-colors" required>
      </div>
      <div>
        <input type="email" name="email" placeholder="Email Address" class="w-full px-4 py-3.5 text-gray-900 placeholder-gray-300 bg-white border-b-2 border-gray-200 
                 focus:border-amber-500 focus:outline-none transition-colors" required>
      </div>

      <div>
        <input type="password" name="password" placeholder="Password" class="w-full px-4 py-3.5 text-gray-900 placeholder-gray-300 bg-white border-b-2 border-gray-200 
                 focus:border-amber-500 focus:outline-none transition-colors" required>
      </div>

      <div>
        <input type="password" name="confirmPassword" placeholder="Confirm Password" class="w-full px-4 py-3.5 text-gray-900 placeholder-gray-300 bg-white border-b-2 border-gray-200 
                 focus:border-amber-500 focus:outline-none transition-colors" required>
      </div>

      <button type="submit" class="w-full mt-6 py-4 text-white font-medium bg-[#F0BD66] rounded-lg 
               hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
        Sign up
      </button>

      <p class="text-center text-sm text-gray-400 mt-6">
        Already have an account?
        <a href="/auth/sign-in" class="text-[#F0BD66] font-medium hover:text-amber-600 transition-colors">
          Sign in
        </a>
      </p>
    </form>
  </div>
</div>

```

### src/views/auth/verification.handlebars

```
<div class="w-full max-w-2xl px-5 ">
  <div class="bg-white rounded-xl shadow-md p-12 px-20">
    <h1 class="text-3xl font-semibold text-gray-900 text-center mb-3">OTP Verification</h1>
    <p class="text-gray-400 text-center mb-10">
      Enter the 6-digit verification code that was sent to your email.
    </p><p class="text-gray-400 text-center mb-10">
      In the unlikely case no email was sent, enter: 123456
    </p>

    <form id="otpForm" onsubmit="handleVerification(event)">
      <div class="flex justify-center gap-3 mb-8">
        <input type="text" maxlength="1" class="otp-input w-16 h-16 text-center text-2xl font-semibold text-gray-900 bg-gray-50 
                 border-2 border-gray-200 rounded-lg focus:border-amber-500 focus:bg-white 
                 focus:outline-none transition-all" required>
        <input type="text" maxlength="1" class="otp-input w-16 h-16 text-center text-2xl font-semibold
               text-gray-900 bg-gray-50 border-2 border-gray-200 rounded-lg focus:border-amber-500 
               focus:bg-white focus:outline-none transition-all" required>
        <input type="text" maxlength="1" class="otp-input w-16 h-16 text-center text-2xl font-semibold
               text-gray-900 bg-gray-50 border-2 border-gray-200 rounded-lg focus:border-amber-500 
               focus:bg-white focus:outline-none transition-all" required>
        <input type="text" maxlength="1" class="otp-input w-16 h-16 text-center text-2xl font-semibold
               text-gray-900 bg-gray-50 border-2 border-gray-200 rounded-lg focus:border-amber-500 
               focus:bg-white focus:outline-none transition-all" required>
        <input type="text" maxlength="1" class="otp-input w-16 h-16 text-center text-2xl font-semibold
               text-gray-900 bg-gray-50 border-2 border-gray-200 rounded-lg focus:border-amber-500 
               focus:bg-white focus:outline-none transition-all" required>
        <input type="text" maxlength="1" class="otp-input w-16 h-16 text-center text-2xl font-semibold
               text-gray-900 bg-gray-50 border-2 border-gray-200 rounded-lg focus:border-amber-500 
               focus:bg-white focus:outline-none transition-all" required>
      </div>

      <button type="submit" class="w-full py-4 text-white font-medium bg-gradient-to-r from-amber-400 to-amber-500 
               rounded-lg hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
        Verify Account
      </button>

      <p class="text-center text-sm text-gray-400 mt-6">
        Didn't receive code? Please
        Contact professor
      </p>
    </form>
  </div>
</div>

```

### src/views/error.handlebars

```
<div
    class="w-full h-screen flex flex-col lg:flex-row items-center justify-center space-y-16 lg:space-y-0 space-x-8 2xl:space-x-0">
    <div class="w-full lg:w-1/2 flex flex-col items-center justify-center lg:px-2 xl:px-0 text-center">
        <p class="text-7xl md:text-8xl lg:text-9xl font-bold tracking-wider text-gray-300">404</p>
        <p class="text-4xl md:text-5xl lg:text-6xl font-bold tracking-wider text-gray-300 mt-2">Page Not Found</p>
        <p class="text-lg md:text-xl lg:text-2xl text-gray-500 my-12">Sorry, the page you are looking for could not be
            found.</p>
        <a href="/"
            class="flex items-center space-x-2 bg-primary hover:bg-black text-gray-100 px-4 py-2 rounded transition duration-150"
            title="Return Home">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd"
                    d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z"
                    clip-rule="evenodd"></path>
            </svg>
            <span>Return Home</span>
        </a>
    </div>
    <div class="w-1/2 lg:h-full flex lg:items-end justify-center p-4">
        <svg class="w-full text-blue-600" xmlns="http://www.w3.org/2000/svg" data-name="Layer 1"
            viewBox="0 0 1120.59226 777.91584" xmlns:xlink="http://www.w3.org/1999/xlink">
            <title>not found</title>
            <circle cx="212.59226" cy="103" r="64" fill="#ff6584"></circle>
            <path
                d="M563.68016,404.16381c0,151.01141-89.77389,203.73895-200.51559,203.73895S162.649,555.17522,162.649,404.16381,363.16457,61.04208,363.16457,61.04208,563.68016,253.1524,563.68016,404.16381Z"
                transform="translate(-39.70387 -61.04208)" fill="#cbd5e1"></path>
            <polygon
                points="316.156 523.761 318.21 397.378 403.674 241.024 318.532 377.552 319.455 320.725 378.357 207.605 319.699 305.687 319.699 305.687 321.359 203.481 384.433 113.423 321.621 187.409 322.658 0 316.138 248.096 316.674 237.861 252.547 139.704 315.646 257.508 309.671 371.654 309.493 368.625 235.565 265.329 309.269 379.328 308.522 393.603 308.388 393.818 308.449 394.99 293.29 684.589 313.544 684.589 315.974 535.005 389.496 421.285 316.156 523.761"
                fill="#3f3d56"></polygon>
            <path
                d="M1160.29613,466.01367c0,123.61-73.4842,166.77-164.13156,166.77s-164.13156-43.16-164.13156-166.77S996.16457,185.15218,996.16457,185.15218,1160.29613,342.40364,1160.29613,466.01367Z"
                transform="translate(-39.70387 -61.04208)" fill="#cbd5e1"></path>
            <polygon
                points="950.482 552.833 952.162 449.383 1022.119 321.4 952.426 433.154 953.182 386.639 1001.396 294.044 953.382 374.329 953.382 374.329 954.741 290.669 1006.369 216.952 954.954 277.514 955.804 124.11 950.467 327.188 950.906 318.811 898.414 238.464 950.064 334.893 945.173 428.327 945.027 425.847 884.514 341.294 944.844 434.608 944.232 446.293 944.123 446.469 944.173 447.428 931.764 684.478 948.343 684.478 950.332 562.037 1010.514 468.952 950.482 552.833"
                fill="#3f3d56"></polygon>
            <ellipse cx="554.59226" cy="680.47903" rx="554.59226" ry="28.03433" fill="#3f3d56"></ellipse>
            <ellipse cx="892.44491" cy="726.79663" rx="94.98858" ry="4.80162" fill="#3f3d56"></ellipse>
            <ellipse cx="548.71959" cy="773.11422" rx="94.98858" ry="4.80162" fill="#3f3d56"></ellipse>
            <ellipse cx="287.94432" cy="734.27887" rx="217.01436" ry="10.96996" fill="#3f3d56"></ellipse>
            <circle cx="97.08375" cy="566.26982" r="79" fill="#2f2e41"></circle>
            <rect x="99.80546" y="689.02332" width="24" height="43"
                transform="translate(-31.32451 -62.31008) rotate(0.67509)" fill="#2f2e41"></rect>
            <rect x="147.80213" y="689.58887" width="24" height="43"
                transform="translate(-31.31452 -62.87555) rotate(0.67509)" fill="#2f2e41"></rect>
            <ellipse cx="119.54569" cy="732.61606" rx="7.5" ry="20"
                transform="translate(-654.1319 782.47948) rotate(-89.32491)" fill="#2f2e41"></ellipse>
            <ellipse cx="167.55414" cy="732.18168" rx="7.5" ry="20"
                transform="translate(-606.25475 830.05533) rotate(-89.32491)" fill="#2f2e41"></ellipse>
            <circle cx="99.31925" cy="546.29477" r="27" fill="#fff"></circle>
            <circle cx="99.31925" cy="546.29477" r="9" fill="#3f3d56"></circle>
            <path
                d="M61.02588,552.94636c-6.04185-28.64075,14.68758-57.26483,46.30049-63.93367s62.13813,11.14292,68.18,39.78367-14.97834,38.93-46.59124,45.59886S67.06774,581.58712,61.02588,552.94636Z"
                transform="translate(-39.70387 -61.04208)" fill="#F0BD66"></path>
            <path
                d="M257.29613,671.38411c0,55.07585-32.73985,74.3063-73.13,74.3063q-1.40351,0-2.80255-.0312c-1.87139-.04011-3.72494-.1292-5.55619-.254-36.45135-2.57979-64.77127-22.79937-64.77127-74.02113,0-53.00843,67.73872-119.89612,72.827-124.84633l.00892-.00889c.19608-.19159.29409-.28516.29409-.28516S257.29613,616.30827,257.29613,671.38411Z"
                transform="translate(-39.70387 -61.04208)" fill="#F0BD66"></path>
            <path
                d="M181.50168,737.26482l26.747-37.37367-26.81386,41.4773-.07125,4.29076c-1.87139-.04011-3.72494-.1292-5.55619-.254l2.88282-55.10258-.0223-.42775.049-.0802.27179-5.20415-26.88076-41.5798,26.96539,37.67668.06244,1.105,2.17874-41.63324-23.0132-42.96551,23.29391,35.6583,2.26789-86.31419.00892-.294v.28516l-.37871,68.064,22.91079-26.98321-23.00435,32.84678-.60595,37.27566L204.18523,621.958l-21.4805,41.259-.33863,20.723,31.05561-49.79149-31.17146,57.023Z"
                transform="translate(-39.70387 -61.04208)" fill="#3f3d56"></path>
            <circle cx="712.48505" cy="565.41532" r="79" fill="#2f2e41"></circle>
            <rect x="741.77716" y="691.82355" width="24" height="43"
                transform="translate(-215.99457 191.86399) rotate(-17.08345)" fill="#2f2e41"></rect>
            <rect x="787.6593" y="677.72286" width="24" height="43"
                transform="matrix(0.95588, -0.29376, 0.29376, 0.95588, -209.82788, 204.72037)" fill="#2f2e41"></rect>
            <ellipse cx="767.887" cy="732.00275" rx="20" ry="7.5"
                transform="translate(-220.8593 196.83312) rotate(-17.08345)" fill="#2f2e41"></ellipse>
            <ellipse cx="813.47537" cy="716.94619" rx="20" ry="7.5"
                transform="translate(-214.42477 209.56103) rotate(-17.08345)" fill="#2f2e41"></ellipse>
            <circle cx="708.52153" cy="545.71023" r="27" fill="#fff"></circle>
            <circle cx="708.52153" cy="545.71023" r="9" fill="#3f3d56"></circle>
            <path
                d="M657.35526,578.74316c-14.48957-25.43323-3.47841-59.016,24.59412-75.0092s62.57592-8.34055,77.06549,17.09268-2.39072,41.6435-30.46325,57.63671S671.84483,604.17639,657.35526,578.74316Z"
                transform="translate(-39.70387 -61.04208)" fill="#F0BD66"></path>
            <path
                d="M611.29613,661.29875c0,50.55711-30.05368,68.20979-67.13,68.20979q-1.28835,0-2.57261-.02864c-1.71785-.03682-3.41933-.1186-5.10033-.23313-33.46068-2.36813-59.45707-20.92878-59.45707-67.948,0-48.65932,62.18106-110.05916,66.85186-114.60322l.00819-.00817c.18-.17587.27-.26177.27-.26177S611.29613,610.74164,611.29613,661.29875Z"
                transform="translate(-39.70387 -61.04208)" fill="#F0BD66"></path>
            <path
                d="M541.72029,721.77424l24.55253-34.30732-24.6139,38.07426-.0654,3.93872c-1.71785-.03682-3.41933-.1186-5.10033-.23313l2.6463-50.58165-.02047-.39266.045-.07361.24949-4.77718-24.67531-38.16836,24.753,34.58547.05731,1.01433,2-38.21741-21.12507-39.44039L541.80616,625.928l2.08182-79.23247.00819-.26994v.26177l-.34764,62.47962,21.031-24.76934-21.11693,30.15184-.55624,34.21735,19.63634-32.839-19.71812,37.87389-.31085,19.0228,28.50763-45.70631-28.614,52.34448Z"
                transform="translate(-39.70387 -61.04208)" fill="#3f3d56"></path>
            <path
                d="M875.29613,682.38411c0,55.07585-32.73985,74.3063-73.13,74.3063q-1.4035,0-2.80255-.0312c-1.87139-.04011-3.72494-.1292-5.55619-.254-36.45135-2.57979-64.77127-22.79937-64.77127-74.02113,0-53.00843,67.73872-119.89612,72.827-124.84633l.00892-.00889c.19608-.19159.29409-.28516.29409-.28516S875.29613,627.30827,875.29613,682.38411Z"
                transform="translate(-39.70387 -61.04208)" fill="#F0BD66"></path>
            <path
                d="M799.50168,748.26482l26.747-37.37367-26.81386,41.4773-.07125,4.29076c-1.87139-.04011-3.72494-.1292-5.55619-.254l2.88282-55.10258-.0223-.42775.049-.0802.27179-5.20415L770.108,654.01076l26.96539,37.67668.06244,1.105,2.17874-41.63324-23.0132-42.96551,23.29391,35.6583,2.26789-86.31419.00892-.294v.28516l-.37871,68.064,22.91079-26.98321-23.00435,32.84678-.606,37.27566L822.18523,632.958l-21.4805,41.259-.33863,20.723,31.05561-49.79149-31.17146,57.023Z"
                transform="translate(-39.70387 -61.04208)" fill="#3f3d56"></path>
            <ellipse cx="721.51694" cy="656.82212" rx="12.40027" ry="39.5"
                transform="translate(-220.83517 966.22323) rotate(-64.62574)" fill="#2f2e41"></ellipse>
            <ellipse cx="112.51694" cy="651.82212" rx="12.40027" ry="39.5"
                transform="translate(-574.07936 452.71367) rotate(-68.15829)" fill="#2f2e41"></ellipse>
        </svg>
    </div>
</div>

```

### src/views/layouts/auth.handlebars

```
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{title}}</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>

<body class="min-h-screen bg-[#F9FAFE]  flex items-center justify-center">


    <main>
        {{{body}}}
    </main>

    <div id="auth-toast" class="fixed top-5 right-5 z-50 space-y-3"></div>
    <script src="/public/js/auth.js"></script>
    <script src="/public/js/utils.js"></script>
</body>

</html>

```

### src/views/layouts/main.handlebars

```
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{title}}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/ag-grid-community/dist/ag-grid-community.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/quill/1.3.7/quill.min.js"></script>

    <link rel="stylesheet" href="/public/css/style.css" />
    <script src="/public/js/tailwind.config.js"></script>


    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ag-grid-community/styles/ag-theme-alpine.css" />
    <link rel="stylesheet" href="/public/css/ag-grid.css" />
    <link href="https://cdnjs.cloudflare.com/ajax/libs/quill/1.3.7/quill.snow.css" rel="stylesheet">
    <link rel="stylesheet" href="/public/css/quill.css" />

</head>

<body class="min-h-screen bg-tertiary flex items-center justify-center">
    <div class="flex w-full h-screen  rounded-3xl shadow-sm">
        {{!-- {{> sidebar }} --}}
        <div id="mainContainer" data-user='{{{ json user }}}'
            class=" flex-1 flex flex-col   m-4 rounded-2xl  overflow-hidden">
            {{{body}}}
        </div>
    </div>

    <div id="auth-toast" class="fixed top-5 right-5 z-50 space-y-3"></div>


    {{!-- <div onclick="handleThemeToggle()"
        class="absolute group z-50 hover:cursor-pointer flex gap-1 bg-black p-1 rounded-2xl px-2 text-white right-1 top-32">
        <div class="hidden group-hover:block">
            Theme
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6">
            <path
                d="M18.75 12.75h1.5a.75.75 0 0 0 0-1.5h-1.5a.75.75 0 0 0 0 1.5ZM12 6a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 12 6ZM12 18a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 12 18ZM3.75 6.75h1.5a.75.75 0 1 0 0-1.5h-1.5a.75.75 0 0 0 0 1.5ZM5.25 18.75h-1.5a.75.75 0 0 1 0-1.5h1.5a.75.75 0 0 1 0 1.5ZM3 12a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 3 12ZM9 3.75a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0-4.5ZM12.75 12a2.25 2.25 0 1 1 4.5 0 2.25 2.25 0 0 1-4.5 0ZM9 15.75a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0-4.5Z" />
        </svg>

    </div>
    <div id="themeDropdown"
        class="absolute right-1 top-44 hidden  w-48 rounded-lg bg-white shadow-lg border text-sm p-3 space-y-3">
        <div>
            <label class="block text-xs font-medium mb-1">Primary</label>
            <input type="color" id="primaryColor" value="#F0BD66" class="w-full h-8 cursor-pointer" />
        </div>

        <div>
            <label class="block text-xs font-medium mb-1">Secondary</label>
            <input type="color" id="secondaryColor" value="#FFF7E8" class="w-full h-8 cursor-pointer" />
        </div>

        <div>
            <label class="block text-xs font-medium mb-1">Tertiary</label>
            <input type="color" id="tertiaryColor" value="#000000" class="w-full h-8 cursor-pointer" />
        </div>

        <button class="w-full mt-2 bg-black text-white py-1.5 rounded-md hover:opacity-90" onclick="applyCustomTheme()">
            Apply
        </button>
    </div> --}}


    <script src="/public/js/theme.js"></script>
    <script src="/public/js/utils.js"></script>
</body>

</html>

```

### src/views/main/category-detail.handlebars

```
<!-- Header -->
<div
    class="sticky flex justify-between top-0 inset-x-0 z-20 mt-6 mx-6 bg-white border-y border-gray-400 px-4 sm:px-6 lg:px-8">
    <div class="flex items-center py-2 gap-4">
        <!-- Toggle + Logo Container -->
        <div id="toggleLogoContainer" class="flex items-center gap-4">
            <!-- Sidebar Toggle Button -->
            <button type="button" id="sidebarToggle"
                class="size-8 flex justify-center items-center gap-x-2 border border-gray-400 rounded-xl text-gray-800 hover:text-gray-500 focus:outline-hidden focus:text-gray-500"
                aria-label="Toggle sidebar" onclick="toggleSidebar()">
                <span class="sr-only">Toggle Sidebar</span>
                <svg class="shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                    stroke-linejoin="round">
                    <rect width="18" height="18" x="3" y="3" rx="2" />
                    <path d="M15 3v18" />
                    <path d="m8 9 3 3-3 3" />
                </svg>
            </button>

            <!-- Logo/Brand -->
            <a href="/" class="flex items-center gap-2">
                <svg class="size-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                    stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round"
                        d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42" />
                </svg>
                <span class="font-bold text-lg text-gray-800 hidden sm:block">UI Components</span>
            </a>
        </div>


        <!-- Breadcrumb -->
        <ol class="ms-3 hidden md:flex items-center whitespace-nowrap">
            <li class="flex items-center text-sm text-gray-800">
                <a href="/" class="hover:text-primary">Home</a>
                <svg class="shrink-0 mx-3 overflow-visible size-2.5 text-gray-400" width="16" height="16"
                    viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 1L10.6869 7.16086C10.8637 7.35239 10.8637 7.64761 10.6869 7.83914L5 14"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                </svg>
            </li>
            <li class="text-sm font-semibold text-gray-800 truncate" aria-current="page">
                {{categoryName}}
            </li>
        </ol>
    </div>

    <div class="flex items-center py-2 gap-3">
        <!-- Category Filter Dropdown -->
        <div class="relative hidden sm:block">
            <select id="categoryFilter" onchange="handleCategoryFilter(event)"
                class="h-8 px-3 text-sm border border-gray-400 rounded-xl text-gray-800 focus:outline-none focus:border-primary appearance-none pr-8 bg-white">
                {{#each allCategories}}
                <option value="{{this.slug}}" {{#if this.isActive}}selected{{/if}}>{{this.name}} ({{this.count}})
                </option>
                {{/each}}
            </select>
            <svg class="absolute right-2 top-2 size-4 text-gray-400 pointer-events-none"
                xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
        </div>

        {{#if user}}
        <!-- Add Component Button -->
        <button command="show-modal" commandfor="dialog"
            class="h-8 px-3 text-sm hover:text-white hover:bg-primary hover:cursor-pointer hover:shadow-xl flex justify-center items-center gap-x-2 border border-gray-400 rounded-xl text-gray-800 rounded-lg focus:outline-hidden disabled:opacity-50 disabled:pointer-events-none transition-all"
            title="Create new component">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4">
                <path
                    d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
            </svg>
            <span class="hidden sm:inline">Add Component</span>
        </button>

        <!-- User Menu Dropdown -->
        <div class="relative">
            <button onclick="toggleUserMenu()"
                class="h-8 w-8 flex items-center justify-center rounded-full bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-all">
                {{substring user.last_name 0 1}}
            </button>

            <!-- Dropdown Menu -->
            <div id="userMenu"
                class="hidden absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <div class="px-4 py-2 border-b border-gray-200">
                    <p class="text-sm font-semibold text-gray-800">{{user.last_name}}</p>
                    <p class="text-xs text-gray-500 truncate">{{user.email}}</p>
                </div>
                <a href="/my-components" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    <svg class="inline size-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                        stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 0 1-1.125-1.125v-3.75ZM14.25 8.625c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 0 1-1.125-1.125v-8.25ZM3.75 16.125c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 0 1-1.125-1.125v-2.25Z" />
                    </svg>
                    My Components
                </a>
                <a href="/auth/sign-out" class="block px-4 py-2 text-sm text-red-600 hover:bg-gray-100">
                    <svg class="inline size-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                        stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M13.5 10.5V6.75a4.5 4.5 0 1 1 9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                    </svg>
                    Sign Out
                </a>
            </div>
        </div>
        {{else}}
        <a href="/auth/sign-in"
            class="h-8 px-3 text-sm hover:text-white hover:bg-primary hover:cursor-pointer hover:shadow-xl flex justify-center items-center gap-x-2 border border-gray-400 rounded-xl text-gray-800 rounded-lg focus:outline-hidden transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                stroke="currentColor" class="size-4">
                <path stroke-linecap="round" stroke-linejoin="round"
                    d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
            Sign In
        </a>
        {{/if}}
    </div>
</div>

<!-- Sidebar + Main Content Layout -->
<div class="flex relative">

    <!-- Sidebar Navigation -->
    <aside id="category-sidebar"
        class="w-64 bg-white border-r border-gray-300 min-h-screen sticky top-0 overflow-y-auto transition-all duration-300 ease-in-out"
        style="margin-left: -256px;">

        <div class="p-6">
            <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Navigation</h3>
            <nav class="space-y-1">
                <a href="/"
                    class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100">
                    <svg class="size-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                        stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                    </svg>
                    Home
                </a>

                <a href="/documentation"
                    class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100">
                    <svg class="size-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                        stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                    </svg>
                    Documentation
                </a>

                <a href="/about"
                    class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100">
                    <svg class="size-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                        stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                    </svg>
                    About
                </a>

                {{#if user}}
                <a href="/my-components"
                    class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100">
                    <svg class="size-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                        stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 0 1-1.125-1.125v-3.75ZM14.25 8.625c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 0 1-1.125-1.125v-8.25ZM3.75 16.125c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 0 1-1.125-1.125v-2.25Z" />
                    </svg>
                    My Components
                </a>
                {{/if}}

                <a href="/support"
                    class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100">
                    <svg class="size-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                        stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
                    </svg>
                    Support
                </a>
            </nav>

            <!-- Divider -->
            <div class="my-6 border-t border-gray-200"></div>

            <!-- Current Category Info -->
            <div class="px-3 py-2 bg-gray-50 rounded-lg">
                <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Current Category</p>
                <p class="text-sm font-medium text-gray-800">{{categoryName}}</p>
                <p class="text-xs text-gray-500 mt-1">{{components.length}} components</p>
            </div>
        </div>
    </aside>

    <!-- Main Content Area -->
    <main class="flex-1 p-6 transition-all duration-300" id="mainContent">
        <!-- Category Header -->
        <div class="mb-8">
            <h1 class="text-4xl font-bold text-gray-900 mb-2">{{categoryName}}</h1>
            <p class="text-gray-600">{{components.length}} components in this category</p>
        </div>

        <!-- Components List -->
        <div class="space-y-12">
            {{#if components}}
            {{#each components}}
            {{!-- <div class="component-item border border-gray-300 rounded-xl overflow-hidden bg-white">

                <!-- Component Header -->
                <div class="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                    <div>
                        <h3 class="text-xl font-semibold text-gray-900">{{this.title}}</h3>
                        <p class="text-sm text-gray-600 mt-1">{{this.description}}</p>
                    </div>
                    <div class="flex items-center gap-4 text-sm text-gray-500">
                        {{#if this.isNew}}
                        <span class="bg-secondary text-primary px-2 py-1 rounded-full text-xs font-medium">NEW</span>
                        {{/if}}
                        <span>👁 {{this.views}}</span>
                        <span>❤️ {{this.likes}}</span>
                    </div>
                </div>

                <!-- Component Preview -->
                <div class="p-8 bg-gray-50 border-b border-gray-200">
                    <div class="bg-white rounded-lg border border-gray-200 p-6 min-h-[200px]">
                        {{{this.htmlCode}}}
                    </div>
                </div>

                <!-- Component Code -->
                <div class="bg-primary">
                    <div class="px-6 py-3 flex items-center justify-between border-b border-gray-800">
                        <span class="text-sm font-medium text-gray-400">HTML</span>
                        <button onclick="copyCode('code-{{@index}}')"
                            class="px-3 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-white rounded-md transition">
                            Copy Code
                        </button>
                    </div>
                    <div class="p-6 overflow-x-auto">
                        <pre
                            class="text-sm"><code id="code-{{@index}}" class="text-green-400 font-mono">{{this.htmlCode}}</code></pre>
                    </div>
                </div>

                <!-- Component Meta -->
                <div
                    class="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
                    <div>
                        Created by <span class="font-medium text-gray-700">{{this.createdBy.last_name}}</span>
                    </div>
                    <div>
                        {{formatDate this.createdAt}}
                    </div>
                </div>

            </div> --}}
            {{/each}}
            {{else}}
            <div class="text-center py-20">
                <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 class="mt-2 text-sm font-medium text-gray-900">No components</h3>
                <p class="mt-1 text-sm text-gray-500">Get started by creating a new component.</p>
                {{#if user}}
                <div class="mt-6">
                    <button command="show-modal" commandfor="dialog"
                        class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90">
                        <svg class="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"
                            fill="currentColor">
                            <path fill-rule="evenodd"
                                d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                                clip-rule="evenodd" />
                        </svg>
                        New Component
                    </button>
                </div>
                {{/if}}
            </div>
            {{/if}}
        </div>
    </main>
</div>

{{!-- Modals --}}
{{> component-editor-modal}}


<script>
    function copyCode(elementId) {
        const codeElement = document.getElementById(elementId);
        const code = codeElement.textContent;

        navigator.clipboard.writeText(code).then(() => {
            const button = event.target;
            const originalText = button.textContent;
            button.textContent = 'Copied!';
            button.classList.add('bg-green-600');

            setTimeout(() => {
                button.textContent = originalText;
                button.classList.remove('bg-green-600');
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy:', err);
        });
    }

    function handleCategoryFilter(event) {
        const category = event.target.value;
        window.location.href = `/category/${category}`;
    }

    function handleSearch(event) {
        const searchTerm = event.target.value.toLowerCase();
        const components = document.querySelectorAll('.component-item');

        components.forEach(component => {
            const title = component.querySelector('h3').textContent.toLowerCase();
            const description = component.querySelector('p').textContent.toLowerCase();

            if (title.includes(searchTerm) || description.includes(searchTerm)) {
                component.classList.remove('hidden');
            } else {
                component.classList.add('hidden');
            }
        });
    }

    function toggleUserMenu() {
        const menu = document.getElementById('userMenu');
        menu.classList.toggle('hidden');
    }

    // Sidebar toggle function
    function toggleSidebar() {
        const sidebar = document.getElementById('category-sidebar');
        const toggleButton = document.getElementById('sidebarToggle');
        const currentMargin = sidebar.style.marginLeft;

        if (currentMargin === '0px') {
            // Close sidebar
            sidebar.style.marginLeft = '-256px';
            toggleButton.classList.remove('order-2');
            toggleButton.classList.add('order-first');
        } else {
            // Open sidebar
            sidebar.style.marginLeft = '0';
            toggleButton.classList.remove('order-first');
            toggleButton.classList.add('order-2');
        }
    }

    // Close user menu when clicking outside
    document.addEventListener('click', (event) => {
        const userMenu = document.getElementById('userMenu');
        const userButton = event.target.closest('button[onclick="toggleUserMenu()"]');

        if (userMenu && !userMenu.contains(event.target) && !userButton) {
            userMenu.classList.add('hidden');
        }
    });
</script>

<script src="/public/js/home.js"></script>

```

### src/views/main/home.handlebars

```
<!-- Header -->
<div
    class="sticky flex justify-between top-0 inset-x-0 z-20 mt-6 mx-6 bg-white border-y border-gray-400 px-4 sm:px-6 lg:px-8">
    <div class="flex items-center py-2 gap-4">
        <!-- Toggle + Logo Container -->
        <div id="toggleLogoContainer" class="flex items-center gap-4">
            <!-- Sidebar Toggle Button -->
            <button type="button" id="sidebarToggle"
                class="size-8 flex justify-center items-center gap-x-2 border border-gray-400 rounded-xl text-gray-800 hover:text-gray-500 focus:outline-hidden focus:text-gray-500"
                aria-label="Toggle sidebar" onclick="toggleSidebar()">
                <span class="sr-only">Toggle Sidebar</span>
                <svg class="shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                    stroke-linejoin="round">
                    <rect width="18" height="18" x="3" y="3" rx="2" />
                    <path d="M15 3v18" />
                    <path d="m8 9 3 3-3 3" />
                </svg>
            </button>

            <!-- Logo/Brand -->
            <a href="/" class="flex items-center gap-2">
                <svg class="size-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                    stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round"
                        d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42" />
                </svg>
                <span class="font-bold text-lg text-gray-800 hidden sm:block">UI Components</span>
            </a>
        </div>

        <!-- Search Bar -->
        <div class="relative hidden md:block">
            <input type="text" id="searchInput" placeholder="Search components..."
                class="w-64 px-4 py-1.5 text-sm border border-gray-400 rounded-lg focus:outline-none focus:border-primary"
                onkeyup="handleSearch(event)">
            <svg class="absolute right-3 top-2 size-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none"
                viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round"
                    d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
        </div>

        <!-- Stats Badge -->
        {{#if totalComponents}}
        <span class="hidden lg:flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-lg text-sm text-gray-600">
            <svg class="size-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round"
                    d="M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 0 1-1.125-1.125v-3.75ZM14.25 8.625c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 0 1-1.125-1.125v-8.25ZM3.75 16.125c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 0 1-1.125-1.125v-2.25Z" />
            </svg>
            {{totalComponents}} Components
        </span>
        {{/if}}
    </div>

    <div class="flex items-center py-2 gap-3">
        <!-- Category Filter Dropdown -->
        <div class="relative hidden sm:block">
            <select id="categoryFilter" onchange="handleCategoryFilter(event)"
                class="h-8 px-3 text-sm border border-gray-400 rounded-xl text-gray-800 focus:outline-none focus:border-primary appearance-none pr-8 bg-white">
                <option value="all">All Categories</option>
                {{#each categories}}
                <option value="{{this.slug}}">{{this.name}} ({{this.count}})</option>
                {{/each}}
            </select>
            <svg class="absolute right-2 top-2 size-4 text-gray-400 pointer-events-none"
                xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
        </div>

        {{#if user}}
        <!-- Add Component Button -->
        <button command="show-modal" commandfor="dialog"
            class="h-8 px-3 text-sm hover:text-white hover:bg-primary hover:cursor-pointer hover:shadow-xl flex justify-center items-center gap-x-2 border border-gray-400 rounded-xl text-gray-800 rounded-lg focus:outline-hidden disabled:opacity-50 disabled:pointer-events-none transition-all"
            title="Create new component">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4">
                <path
                    d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
            </svg>
            <span class="hidden sm:inline">Add Component</span>
        </button>

        <!-- User Menu Dropdown -->
        <div class="relative">
            <button onclick="toggleUserMenu()"
                class="h-8 w-8 flex items-center justify-center rounded-full bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-all">
                {{substring user.last_name 0 1}}
            </button>

            <!-- Dropdown Menu -->
            <div id="userMenu"
                class="hidden absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <div class="px-4 py-2 border-b border-gray-200">
                    <p class="text-sm font-semibold text-gray-800">{{user.last_name}}</p>
                    <p class="text-xs text-gray-500 truncate">{{user.email}}</p>
                </div>
                <a href="/my-components" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    <svg class="inline size-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                        stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 0 1-1.125-1.125v-3.75ZM14.25 8.625c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 0 1-1.125-1.125v-8.25ZM3.75 16.125c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 0 1-1.125-1.125v-2.25Z" />
                    </svg>
                    My Components
                </a>
                <a href="/auth/sign-out" class="block px-4 py-2 text-sm text-red-600 hover:bg-gray-100">
                    <svg class="inline size-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                        stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M13.5 10.5V6.75a4.5 4.5 0 1 1 9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                    </svg>
                    Sign Out
                </a>
            </div>
        </div>
        {{else}}
        <a href="/auth/sign-in"
            class="h-8 px-3 text-sm hover:text-white hover:bg-primary hover:cursor-pointer hover:shadow-xl flex justify-center items-center gap-x-2 border border-gray-400 rounded-xl text-gray-800 rounded-lg focus:outline-hidden transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                stroke="currentColor" class="size-4">
                <path stroke-linecap="round" stroke-linejoin="round"
                    d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
            Sign In
        </a>
        {{/if}}
    </div>
</div>

<!-- Sidebar + Main Content Layout -->
<div class="flex relative">

    <!-- Sidebar Navigation -->
    <aside id="home-sidebar"
        class="w-64 bg-white border-r border-gray-300 min-h-screen sticky top-0 overflow-y-auto transition-all duration-300 ease-in-out"
        style="margin-left: -256px;">

        <div class="p-6">
            <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Navigation</h3>
            <nav class="space-y-1">
                <a href="/"
                    class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm bg-primary text-secondary font-semibold">
                    <svg class="size-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                        stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                    </svg>
                    Home
                </a>

                <a href="/documentation"
                    class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100">
                    <svg class="size-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                        stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                    </svg>
                    Documentation
                </a>

                <a href="/about"
                    class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100">
                    <svg class="size-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                        stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                    </svg>
                    About
                </a>

                {{#if user}}
                <a href="/my-components"
                    class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100">
                    <svg class="size-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                        stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 0 1-1.125-1.125v-3.75ZM14.25 8.625c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 0 1-1.125-1.125v-8.25ZM3.75 16.125c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 0 1-1.125-1.125v-2.25Z" />
                    </svg>
                    My Components
                </a>
                {{/if}}

                <a href="/support"
                    class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100">
                    <svg class="size-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                        stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
                    </svg>
                    Support
                </a>
            </nav>
        </div>
    </aside>

    <!-- Main Content Area -->
    <main class="flex-1">
        <!-- Content -->
        <div class="">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-6">

                {{#each categories}}
                <a href="/category/{{this.slug}}" class="component-card group block">
                    <div
                        class="bg-gray-50 h-[225px] overflow-hidden border border-gray-400 rounded-xl group-hover:border-2 group-hover:border-gray-400 group-hover:shadow-xl">
                        <div
                            class="card-image h-[70%] bg-gray-100 px-10 pt-5 shadow-2xl shadow-white border border-gray-100">
                            <div class="space-y-3 bg-white p-3 rounded-t-xl">
                                <div class="flex items-center space-x-1 mb-4">
                                    <div class="w-2 h-2 rounded-full bg-gray-300"></div>
                                    <div class="w-2 h-2 rounded-full bg-gray-300"></div>
                                    <div class="w-2 h-2 rounded-full bg-gray-300"></div>
                                </div>
                                <div class="space-y-2">
                                    <div class="text-xs text-gray-500">Start your journey</div>
                                    <div class="text-xs text-gray-500">with <span
                                            class="text-primary font-semibold">Preline</span></div>
                                    <div class="inline-block bg-primary rounded px-2 py-1 text-white text-xs mt-2">
                                        Button</div>
                                    <div class="flex items-center space-x-1 mt-2">
                                        <div class="w-1 h-1 rounded-full bg-gray-800"></div>
                                        <div class="w-1 h-1 rounded-full bg-gray-800"></div>
                                        <div class="w-1 h-1 rounded-full bg-gray-800"></div>
                                        <div class="w-1 h-1 rounded-full bg-gray-800"></div>
                                        <div class="w-1 h-1 rounded-full bg-gray-800"></div>
                                    </div>
                                    <div class="flex space-x-2 mt-2">
                                        <div class="h-1 bg-gray-200 rounded flex-1"></div>
                                        <div class="h-1 bg-gray-200 rounded flex-1"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="flex items-center h-[30%] justify-between bg-white p-4">
                            <div>
                                <div class="flex items-center gap-2 mb-1">
                                    <h4 class="font-semibold text-primary text-sm group-hover:text-primary transition">
                                        {{this.name}}
                                    </h4>
                                    {{#if this.hasNew}}
                                    <span
                                        class="bg-secondary text-primary text-xs px-2 py-0.5 rounded-full font-medium">+{{this.newCount}}
                                        NEW</span>
                                    {{/if}}
                                </div>
                                <p class="text-sm text-gray-500">{{this.count}} components</p>
                            </div>
                        </div>
                    </div>
                </a>
                {{/each}}

            </div>
        </div>
    </main>
</div>


{{!-- Modals --}}
{{> component-editor-modal}}


<script>
    // Search functionality
    function handleSearch(event) {
        const searchTerm = event.target.value.toLowerCase();
        const cards = document.querySelectorAll('.component-card');

        cards.forEach(card => {
            const title = card.querySelector('h4').textContent.toLowerCase();
            const category = card.querySelector('p').textContent.toLowerCase();

            if (title.includes(searchTerm) || category.includes(searchTerm)) {
                card.classList.remove('hidden');
            } else {
                card.classList.add('hidden');
            }
        });
    }

    // Category filter
    function handleCategoryFilter(event) {
        const category = event.target.value;

        if (category === 'all') {
            window.location.href = '/';
        } else {
            window.location.href = `/category/${category}`;
        }
    }

    // User menu toggle
    function toggleUserMenu() {
        const menu = document.getElementById('userMenu');
        menu.classList.toggle('hidden');
    }

    // Sidebar toggle function
    function toggleSidebar() {
        const sidebar = document.getElementById('home-sidebar');
        const toggleButton = document.getElementById('sidebarToggle');
        const logo = document.querySelector('a[href="/"]');
        const container = document.getElementById('toggleLogoContainer');
        const currentMargin = sidebar.style.marginLeft;

        if (currentMargin === '0px') {
            // Close sidebar - button goes to left of logo
            sidebar.style.marginLeft = '-256px';
            container.insertBefore(toggleButton, logo);
        } else {
            // Open sidebar - button goes to right of logo
            sidebar.style.marginLeft = '0';
            container.insertBefore(toggleButton, logo.nextSibling);
        }
    }

    // Close menu when clicking outside
    document.addEventListener('click', (event) => {
        const userMenu = document.getElementById('userMenu');
        const userButton = event.target.closest('button[onclick="toggleUserMenu()"]');

        if (userMenu && !userMenu.contains(event.target) && !userButton) {
            userMenu.classList.add('hidden');
        }
    });
</script>

<script src="/public/js/home.js"></script>

```

### src/views/partials/component-editor-modal.handlebars

```
{{!-- Component Editor Modal --}}
<el-dialog>
    <dialog id="dialog" aria-labelledby="dialog-title"
        class="fixed inset-0 size-auto max-h-none max-w-none overflow-y-auto bg-transparent backdrop:bg-transparent">
        <el-dialog-backdrop
            class="fixed inset-0 bg-gray-500/75 transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"></el-dialog-backdrop>

        <div tabindex="0"
            class="flex min-h-full items-end justify-center p-4 text-center focus:outline-none sm:items-center sm:p-0">
            <el-dialog-panel
                class="relative transform w-[80%] overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:my-8 data-closed:sm:translate-y-0 data-closed:sm:scale-95">
                <div class="h-[600px] flex flex-col">

                    <!-- Editor and Preview -->
                    <form id="componentForm" class="flex-1 flex min-h-0" method="POST" action="javascript:void(0);"
                        onsubmit="handleSave(event)">
                        <!-- Editor Panel -->
                        <div class="flex-1 flex w-1/3 flex-col bg-primary border-r border-gray-800">
                            <div
                                class="flex items-center justify-between px-6 py-3 bg-primary/50 border-b border-gray-800">
                                <div class="flex items-center gap-2">
                                    <span class="text-sm font-medium text-gray-400">index.html</span>
                                    <div class="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                </div>
                                <span class="text-xs text-gray-600 font-mono">HTML</span>
                            </div>
                            <textarea id="htmlEditor" name="htmlEditor" required
                                class="flex-1 w-full p-6 bg-primary text-green-500 focus:outline-none resize-none code-editor text-sm editor-scrollbar"
                                placeholder="<!DOCTYPE html>
<html>
  <head>
    <title>Document</title>
  </head>
  <body>
    
  </body>
</html>" spellcheck="false" oninput="handleChangeEditor(event)"></textarea>
                        </div>

                        <!-- Preview Panel -->
                        <div class="flex-1 w-1/3 flex flex-col bg-gray-950 relative">
                            <div
                                class="flex items-center justify-between px-6 py-2.5 bg-primary/50 border border-gray-800">
                                <div class="flex items-center gap-2">
                                    <span class="text-sm font-medium text-gray-400">Preview</span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <div id="movementButton" onclick="handleMovement()"
                                        class="hover:bg-white bg-slate-200 hover:text-black hover:cursor-pointer text-primary p-1 rounded-md">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                                            stroke-width="1.5" stroke="currentColor" class="size-4">
                                            <path stroke-linecap="round" stroke-linejoin="round"
                                                d="M10.05 4.575a1.575 1.575 0 1 0-3.15 0v3m3.15-3v-1.5a1.575 1.575 0 0 1 3.15 0v1.5m-3.15 0 .075 5.925m3.075.75V4.575m0 0a1.575 1.575 0 0 1 3.15 0V15M6.9 7.575a1.575 1.575 0 1 0-3.15 0v8.175a6.75 6.75 0 0 0 6.75 6.75h2.018a5.25 5.25 0 0 0 3.712-1.538l1.732-1.732a5.25 5.25 0 0 0 1.538-3.712l.003-2.024a.668.668 0 0 1 .198-.471 1.575 1.575 0 1 0-2.228-2.228 3.818 3.818 0 0 0-1.12 2.687M6.9 7.575V12m6.27 4.318A4.49 4.49 0 0 1 16.35 15m.002 0h-.002" />
                                        </svg>
                                    </div>

                                    <div onclick="clearEditor()"
                                        class="hover:bg-white hover:text-black hover:cursor-pointer text-secondary p-1 rounded-md">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                                            stroke-width="1.5" stroke="currentColor" class="size-4">
                                            <path stroke-linecap="round" stroke-linejoin="round"
                                                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                                        </svg>
                                    </div>

                                    <div
                                        class="hover:bg-white hover:text-black hover:cursor-pointer text-secondary p-1 rounded-md">
                                        <label class="select-none hover:cursor-pointer">
                                            <input type="checkbox" onchange="handleDisplaySize(event)"
                                                class="peer sr-only">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                                                stroke-width="1.5" stroke="currentColor"
                                                class="size-4 block peer-checked:hidden">
                                                <path stroke-linecap="round" stroke-linejoin="round"
                                                    d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                                            </svg>
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                                                stroke-width="1.5" stroke="currentColor"
                                                class="size-4 hidden peer-checked:block">
                                                <path stroke-linecap="round" stroke-linejoin="round"
                                                    d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" />
                                            </svg>
                                        </label>
                                    </div>

                                    <div onclick="togglePreviewFullscreen()"
                                        class="hover:bg-white hover:text-black hover:cursor-pointer text-secondary p-1 rounded-md">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                                            stroke-width="1.5" stroke="currentColor" class="size-4">
                                            <path stroke-linecap="round" stroke-linejoin="round"
                                                d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            <style id="previewPointerStyle">
                                #preview:hover * {
                                    pointer-events: none;
                                }
                            </style>
                            <style>
                                .grid-bg {
                                    background-color: white;
                                    background-image:
                                        linear-gradient(#ddd 0.5px, transparent 0.5px),
                                        linear-gradient(90deg, #ddd 0.5px, transparent 0.5px),
                                        linear-gradient(#aaa 1px, transparent 1px),
                                        linear-gradient(90deg, #aaa 1px, transparent 1px);
                                    background-size:
                                        20px 20px,
                                        20px 20px,
                                        100px 100px,
                                        100px 100px;
                                }
                            </style>

                            <div id="preview-wrapper"
                                class="grid-bg preview-wrapper bg-white w-full overflow-auto h-full">
                                <div id="fullScreenTools"
                                    class="flex items-center sticky hidden gap-2 bg-black w-fit p-2 rounded-xl m-4 z-50">
                                    <div id="movementButton2" onclick="handleMovement()"
                                        class="hover:bg-white bg-slate-200 hover:text-black hover:cursor-pointer text-primary p-1 rounded-md">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                                            stroke-width="1.5" stroke="currentColor" class="size-6">
                                            <path stroke-linecap="round" stroke-linejoin="round"
                                                d="M10.05 4.575a1.575 1.575 0 1 0-3.15 0v3m3.15-3v-1.5a1.575 1.575 0 0 1 3.15 0v1.5m-3.15 0 .075 5.925m3.075.75V4.575m0 0a1.575 1.575 0 0 1 3.15 0V15M6.9 7.575a1.575 1.575 0 1 0-3.15 0v8.175a6.75 6.75 0 0 0 6.75 6.75h2.018a5.25 5.25 0 0 0 3.712-1.538l1.732-1.732a5.25 5.25 0 0 0 1.538-3.712l.003-2.024a.668.668 0 0 1 .198-.471 1.575 1.575 0 1 0-2.228-2.228 3.818 3.818 0 0 0-1.12 2.687M6.9 7.575V12m6.27 4.318A4.49 4.49 0 0 1 16.35 15m.002 0h-.002" />
                                        </svg>
                                    </div>
                                    <div
                                        class="hover:bg-white hover:text-black hover:cursor-pointer text-secondary p-1 rounded-md">
                                        <label class="select-none hover:cursor-pointer">
                                            <input type="checkbox" onchange="handleDisplaySize(event)"
                                                class="peer sr-only">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                                                stroke-width="1.5" stroke="currentColor"
                                                class="size-6 block peer-checked:hidden">
                                                <path stroke-linecap="round" stroke-linejoin="round"
                                                    d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                                            </svg>
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                                                stroke-width="1.5" stroke="currentColor"
                                                class="size-6 hidden peer-checked:block">
                                                <path stroke-linecap="round" stroke-linejoin="round"
                                                    d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" />
                                            </svg>
                                        </label>
                                    </div>
                                    <div onclick="togglePreviewFullscreen()"
                                        class="hover:bg-white hover:text-black hover:cursor-pointer text-secondary p-1 rounded-md">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                                            stroke-width="1.5" stroke="currentColor" class="size-6">
                                            <path stroke-linecap="round" stroke-linejoin="round"
                                                d="M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5 5.25 5.25" />
                                        </svg>
                                    </div>
                                </div>
                                <div id="preview"
                                    class="flex-1 w-fit p-1 hover:border-2 border-2 relative border-dashed hover:border-black bg-white">
                                </div>
                            </div>
                        </div>

                        <!-- Details Panel -->
                        <div id="detailsPanel"
                            class="flex-1 w-1/3 flex hidden flex-col border-l border-gray-800 gap-4 bg-white relative">
                            <div
                                class="flex items-center justify-between px-6 py-3 border-y border-gray-800 bg-primary/50 bg-primary">
                                <div class="flex items-center gap-2">
                                    <span class="text-sm font-medium text-gray-400">Details</span>
                                </div>
                            </div>

                            <div class="flex flex-col px-4">
                                <div>
                                    <label for="title" class="text-primary p-1">Title</label>
                                    <input type="text" id="title" name="title" placeholder="Header"
                                        class="w-full px-4 mt-2 py-3.5 text-gray-900 placeholder-gray-300 bg-white border border-gray-400 rounded-xl focus:border-primary focus:outline-none transition-colors"
                                        required>
                                </div>
                            </div>

                            <div class="flex flex-col px-4">
                                <div>
                                    <label for="category" class="text-primary p-1">Category</label>
                                    <select id="category" name="category"
                                        class="w-full px-4 mt-2 py-3.5 text-gray-900 bg-white border border-gray-400 rounded-xl focus:border-primary focus:outline-none transition-colors"
                                        required>
                                        <option value="" disabled selected>Select a category</option>
                                        <option value="marketing-hero">Hero Sections</option>
                                        <option value="marketing-hero-forms">Hero Forms</option>
                                        <option value="marketing-icons">Icon Sections</option>
                                        <option value="marketing-pricing">Pricing Sections</option>
                                        <option value="marketing-faq">FAQ Sections</option>
                                        <option value="marketing-blog">Blog Sections</option>
                                        <option value="marketing-testimonials">Testimonials</option>
                                        <option value="marketing-team">Team Sections</option>
                                        <option value="marketing-features">Features</option>
                                        <option value="marketing-announcements">Announcement Banners</option>
                                        <option value="marketing-cards">Card Sections</option>
                                        <option value="marketing-clients">Clients Sections</option>
                                        <option value="marketing-galleries">Galleries</option>
                                        <option value="marketing-timeline">Timeline</option>
                                        <option value="ui-dropdowns">Dropdowns</option>
                                        <option value="ui-selects">Selects</option>
                                        <option value="ui-buttons">Button Groups</option>
                                        <option value="ui-modals">Modals</option>
                                        <option value="ui-cookie-banners">Cookie Banners</option>
                                        <option value="navigation-navbars">Navbars / Headers</option>
                                        <option value="navigation-mega-menu">Mega Menu</option>
                                        <option value="layout-basic">Layouts</option>
                                        <option value="forms-authentication">Authentication</option>
                                        <option value="forms-feedback">Feedback</option>
                                        <option value="forms-subscribe">Subscribe</option>
                                        <option value="forms-textarea">Textarea Inputs</option>
                                        <option value="pages-pricing">Pricing Page</option>
                                        <option value="ecommerce-products">Product Listings</option>
                                        <option value="apps-general">Application Components</option>
                                        <option value="apps-invoice">Invoice</option>
                                        <option value="apps-tables">Tables</option>
                                        <option value="apps-stats">Stats</option>
                                        <option value="apps-charts">Charts</option>
                                        <option value="apps-ai-prompt">AI Prompt</option>
                                        <option value="footer-contact">Contact Sections</option>
                                        <option value="footer-footers">Footers</option>
                                    </select>
                                </div>
                            </div>

                            <div class="flex flex-col px-4 h-full mb-32">
                                <div class="h-full">
                                    <label for="description" class="text-primary p-1">Description</label>
                                    <textarea id="description" name="description" placeholder="Describe your component"
                                        class="w-full h-full px-4 mt-2 py-3.5 text-gray-900 placeholder-gray-300 bg-white border border-gray-400 rounded-xl focus:border-primary focus:outline-none transition-colors"
                                        required></textarea>
                                </div>
                            </div>
                        </div>

                        <!-- Buttons -->
                        <div class="bg-white rounded-xl flex justify-end m-2 absolute right-0 bottom-0">
                            <div
                                class="border border-gray-400 w-fit p-1 gap-2 flex items-center justify-center rounded-xl">
                                <button id="cancelBtn" type="reset" onclick="handleClose()"
                                    class="p-1 hover:bg-primary hover:text-secondary rounded-md hover:cursor-pointer">
                                    Cancel
                                </button>
                                <button id="backBtn" type="button" onclick="handleBack()"
                                    class="hidden p-1 hover:bg-primary hover:text-secondary rounded-md hover:cursor-pointer">
                                    Back
                                </button>
                                <div>|</div>
                                <button id="nextBtn" type="button" onclick="handleNext()"
                                    class="p-1 hover:bg-primary hover:text-secondary rounded-md hover:cursor-pointer">
                                    Next
                                </button>
                                <button id="submitBtn" type="submit"
                                    class="p-1 hidden hover:bg-primary hover:text-secondary rounded-md hover:cursor-pointer">
                                    Submit
                                </button>
                            </div>
                        </div>
                    </form>

                </div>
            </el-dialog-panel>
        </div>
    </dialog>
</el-dialog>

```

### src/views/partials/navbar.handlebars

```
<header>
    <nav class="bg-white border-gray-200 px-4 lg:px-6 py-2.5 dark:bg-gray-800">
        <div class="flex flex-wrap justify-between items-center mx-auto max-w-screen-xl">
            <a href="https://flowbite.com" class="flex items-center">
                <img src="https://flowbite.com/docs/images/logo.svg" class="mr-3 h-6 sm:h-9" alt="Flowbite Logo" />
                <span class="self-center text-xl font-semibold whitespace-nowrap dark:text-white">Flowbite</span>
            </a>
            <div class="flex items-center lg:order-2">
                <a href="#"
                    class="text-gray-800 dark:text-white hover:bg-gray-50 focus:ring-4 focus:ring-gray-300 font-medium rounded-lg text-sm px-4 lg:px-5 py-2 lg:py-2.5 mr-2 dark:hover:bg-gray-700 focus:outline-none dark:focus:ring-gray-800">Log
                    in</a>
                <a href="#"
                    class="text-white bg-primary-700 hover:bg-primary-800 focus:ring-4 focus:ring-primary-300 font-medium rounded-lg text-sm px-4 lg:px-5 py-2 lg:py-2.5 mr-2 dark:bg-primary-600 dark:hover:bg-primary-700 focus:outline-none dark:focus:ring-primary-800">Get
                    started</a>
                <button data-collapse-toggle="mobile-menu-2" type="button"
                    class="inline-flex items-center p-2 ml-1 text-sm text-gray-500 rounded-lg lg:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-600"
                    aria-controls="mobile-menu-2" aria-expanded="false">
                    <span class="sr-only">Open main menu</span>
                    <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path fill-rule="evenodd"
                            d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                            clip-rule="evenodd"></path>
                    </svg>
                    <svg class="hidden w-6 h-6" fill="currentColor" viewBox="0 0 20 20"
                        xmlns="http://www.w3.org/2000/svg">
                        <path fill-rule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clip-rule="evenodd"></path>
                    </svg>
                </button>
            </div>
            <div class="hidden justify-between items-center w-full lg:flex lg:w-auto lg:order-1" id="mobile-menu-2">
                <ul class="flex flex-col mt-4 font-medium lg:flex-row lg:space-x-8 lg:mt-0">
                    <li>
                        <a href="#"
                            class="block py-2 pr-4 pl-3 text-white rounded bg-primary-700 lg:bg-transparent lg:text-primary-700 lg:p-0 dark:text-white"
                            aria-current="page">Home</a>
                    </li>
                    <li>
                        <a href="#"
                            class="block py-2 pr-4 pl-3 text-gray-700 border-b border-gray-100 hover:bg-gray-50 lg:hover:bg-transparent lg:border-0 lg:hover:text-primary-700 lg:p-0 dark:text-gray-400 lg:dark:hover:text-white dark:hover:bg-gray-700 dark:hover:text-white lg:dark:hover:bg-transparent dark:border-gray-700">Company</a>
                    </li>
                    <li>
                        <a href="#"
                            class="block py-2 pr-4 pl-3 text-gray-700 border-b border-gray-100 hover:bg-gray-50 lg:hover:bg-transparent lg:border-0 lg:hover:text-primary-700 lg:p-0 dark:text-gray-400 lg:dark:hover:text-white dark:hover:bg-gray-700 dark:hover:text-white lg:dark:hover:bg-transparent dark:border-gray-700">Marketplace</a>
                    </li>
                    <li>
                        <a href="#"
                            class="block py-2 pr-4 pl-3 text-gray-700 border-b border-gray-100 hover:bg-gray-50 lg:hover:bg-transparent lg:border-0 lg:hover:text-primary-700 lg:p-0 dark:text-gray-400 lg:dark:hover:text-white dark:hover:bg-gray-700 dark:hover:text-white lg:dark:hover:bg-transparent dark:border-gray-700">Features</a>
                    </li>
                    <li>
                        <a href="#"
                            class="block py-2 pr-4 pl-3 text-gray-700 border-b border-gray-100 hover:bg-gray-50 lg:hover:bg-transparent lg:border-0 lg:hover:text-primary-700 lg:p-0 dark:text-gray-400 lg:dark:hover:text-white dark:hover:bg-gray-700 dark:hover:text-white lg:dark:hover:bg-transparent dark:border-gray-700">Team</a>
                    </li>
                    <li>
                        <a href="#"
                            class="block py-2 pr-4 pl-3 text-gray-700 border-b border-gray-100 hover:bg-gray-50 lg:hover:bg-transparent lg:border-0 lg:hover:text-primary-700 lg:p-0 dark:text-gray-400 lg:dark:hover:text-white dark:hover:bg-gray-700 dark:hover:text-white lg:dark:hover:bg-transparent dark:border-gray-700">Contact</a>
                    </li>
                </ul>
            </div>
        </div>
    </nav>
</header>

```

### src/views/partials/sidebar.handlebars

```
<!-- Sidebar -->
<div id="hs-sidebar-content-push-to-mini-sidebar" class="hs-overlay [--auto-close:lg] hs-overlay-minified:w-13 lg:block lg:translate-x-0 lg:end-auto lg:bottom-0 w-64
hs-overlay-open:translate-x-0
-translate-x-full transition-all duration-300 transform
h-full
hidden
overflow-x-hidden
 top-0 start-0 bottom-0 z-60
bg-white border-e border-gray-200" role="dialog" tabindex="-1" aria-label="Sidebar">
    <div class="relative flex flex-col h-full max-h-full ">
        <!-- Header -->
        <header class="py-4 px-2  flex justify-between items-center gap-x-2">

            <a class="flex-none font-semibold text-xl text-black focus:outline-hidden focus:opacity-80 hs-overlay-minified:hidden"
                href="#" aria-label="Brand">Brand</a>

            <div class="lg:hidden">
                <!-- Close Button -->
                <button type="button"
                    class="flex justify-center items-center gap-x-3 size-6 bg-white border border-gray-200 text-sm text-gray-600 hover:bg-gray-100 rounded-full disabled:opacity-50 disabled:pointer-events-none focus:outline-hidden focus:bg-gray-100"
                    data-hs-overlay="#hs-sidebar-content-push-to-mini-sidebar">
                    <svg class="shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                        stroke-linejoin="round">
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                    </svg>
                    <span class="sr-only">Close</span>
                </button>
                <!-- End Close Button -->
            </div>
            <div class="hidden lg:block">
                <!-- Toggle Button -->
                <button type="button"
                    class="flex justify-center items-center flex-none gap-x-3 size-9 text-sm text-gray-600 hover:bg-gray-100 rounded-full disabled:opacity-50 disabled:pointer-events-none focus:outline-hidden focus:bg-gray-100"
                    aria-haspopup="dialog" aria-expanded="false" aria-controls="hs-sidebar-content-push-to-mini-sidebar"
                    aria-label="Minify navigation" data-hs-overlay-minifier="#hs-sidebar-content-push-to-mini-sidebar">
                    <svg class="hidden hs-overlay-minified:block shrink-0 size-4" xmlns="http://www.w3.org/2000/svg"
                        width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                        stroke-linecap="round" stroke-linejoin="round">
                        <rect width="18" height="18" x="3" y="3" rx="2" />
                        <path d="M15 3v18" />
                        <path d="m8 9 3 3-3 3" />
                    </svg>
                    <svg class="hs-overlay-minified:hidden shrink-0 size-4" xmlns="http://www.w3.org/2000/svg"
                        width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                        stroke-linecap="round" stroke-linejoin="round">
                        <rect width="18" height="18" x="3" y="3" rx="2" />
                        <path d="M15 3v18" />
                        <path d="m10 15-3-3 3-3" />
                    </svg>
                    <span class="sr-only">Navigation Toggle</span>
                </button>
                <!-- End Toggle Button -->
            </div>
        </header>
        <!-- End Header -->

        <!-- Body -->
        <nav
            class="h-full overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-300">
            <div class=" pb-0 px-2  w-full flex flex-col flex-wrap">
                <ul class="space-y-1">
                    <li>
                        <a class="min-h-[36px] flex items-center gap-x-3.5 py-2 px-2.5 bg-gray-100 text-sm text-gray-800 rounded-lg hover:bg-gray-100 focus:outline-hidden focus:bg-gray-100"
                            href="#">
                            <svg class="size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
                                viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                                stroke-linecap="round" stroke-linejoin="round">
                                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                <polyline points="9 22 9 12 15 12 15 22" />
                            </svg>
                            <span class="hs-overlay-minified:hidden">Dashboard</span>
                        </a>
                    </li>

                    <li>
                        <a class="min-h-[36px] w-full flex items-center gap-x-3.5 py-2 px-2.5 text-sm text-gray-800 rounded-lg hover:bg-gray-100 focus:outline-hidden focus:bg-gray-100"
                            href="#">
                            <svg class="size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
                                viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                                stroke-linecap="round" stroke-linejoin="round">
                                <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                                <line x1="16" x2="16" y1="2" y2="6" />
                                <line x1="8" x2="8" y1="2" y2="6" />
                                <line x1="3" x2="21" y1="10" y2="10" />
                                <path d="M8 14h.01" />
                                <path d="M12 14h.01" />
                                <path d="M16 14h.01" />
                                <path d="M8 18h.01" />
                                <path d="M12 18h.01" />
                                <path d="M16 18h.01" />
                            </svg>
                            <span class="text-nowrap hs-overlay-minified:hidden">Calendar <span
                                    class="ms-auto py-0.5 px-1.5 inline-flex items-center gap-x-1.5 text-xs bg-gray-200 text-gray-800 rounded-full">New</span></span>
                        </a>
                    </li>
                    <li>
                        <a class="min-h-[36px] w-full flex items-center gap-x-3.5 py-2 px-2.5 text-sm text-gray-800 rounded-lg hover:bg-gray-100 focus:outline-hidden focus:bg-gray-100"
                            href="#">
                            <svg class="size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
                                viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                                stroke-linecap="round" stroke-linejoin="round">
                                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                            </svg>
                            <span class="hs-overlay-minified:hidden">Documentation</span>
                        </a>
                    </li>
                </ul>
            </div>
        </nav>
        <!-- End Body -->
    </div>
</div>
<!-- End Sidebar -->

```

```

### README.md

```markdown


```

### src/app.js

```javascript
import express from "express";
import configRoutes from "./routes/index.js";
import handlebars from "express-handlebars";
import path from "path";
import { fileURLToPath } from "url";

import { requestLogger } from "./middlewares/requestLogger.js";
import { sessionConfig } from "./middlewares/sessionConfig.js";
import { setSessionLocals } from "./middlewares/auth.js";
import lastSeenMiddleware from "./middlewares/lastSeen.js";
import { formatDate, substring } from './utils/handlebars-helpers.js';

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// middlewares
app.use("/public", express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sessionConfig);
app.use(lastSeenMiddleware);

// handlebars setup
app.use(setSessionLocals);
app.use(requestLogger);
app.engine(
    "handlebars",
    handlebars.engine({
        defaultLayout: "main",
        helpers: {
            eq: (a, b) => a === b,
            notEq: (a, b) => a !== b,
            eqStr: (a, b) => String(a) === String(b),
            or: (a, b) => a || b,
            and: (a, b) => a && b,
            not: (a) => !a,
            json: (obj) => JSON.stringify(obj),
            formatDate: formatDate,
            substring: substring
        },
        partialsDir: [path.join(__dirname, "views/partials/")]
    })
);
app.set("view engine", "handlebars");
app.set("views", path.join(__dirname, "views"));

configRoutes(app);


export default app;

```

### src/config/mongoCollections.js

```javascript
// import { dbConnection } from "./mongoConnection.js";

// const getCollectionFn = (collection) => {
//     let _col = undefined;

//     return async () => {
//         if (!_col) {
//             const db = await dbConnection();
//             _col = await db.collection(collection);
//         }

//         return _col;
//     };
// };

// export const questions = getCollectionFn("questions");
// export const users = getCollectionFn("users");
// export const courses = getCollectionFn("courses");
// export const answers = getCollectionFn("answers");
// export const sessions = getCollectionFn("sessions");

```

### src/config/mongoConnection.js

```javascript
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

```

### src/config/settings.js

```javascript
import dotenv from 'dotenv';
dotenv.config();


export const mongoConfig = {
    serverUrl: process.env.MONGO_URI || "mongodb://localhost:27017/",
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



```

### src/controllers/component.controller.js

```javascript
import Component from "../models/component.model.js";

// Get all components
export const getAllComponents = async (req, res) => {
    try {
        const { category } = req.query;

        let query = { isPublished: true };

        if (category) {
            query.category = category;
        }

        const components = await Component.find(query)
            .populate('createdBy', 'name email')
            .sort('-createdAt');

        res.status(200).json({
            success: true,
            data: components
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get single component
export const getComponentById = async (req, res) => {
    try {
        const component = await Component.findById(req.params.id)
            .populate('createdBy', 'name email');

        if (!component) {
            return res.status(404).json({
                success: false,
                message: 'Component not found'
            });
        }

        // Increment views
        component.views += 1;
        await component.save();

        res.status(200).json({
            success: true,
            data: component
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Create component
export const createComponent = async (req, res) => {
    try {
        const { title, category, description, htmlCode, elementsDescription } = req.body;  // ✅ Added elementsDescription

        if (!title || !category || !description || !htmlCode) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields'
            });
        }

        const component = await Component.create({
            title,
            category,
            description,
            htmlCode,
            elementsDescription: elementsDescription || [],  // ✅ Added this
            createdBy: req.session.user.id
        });

        res.status(201).json({
            success: true,
            message: 'Component created successfully',
            data: component
        });
    } catch (error) {
        console.error('Create component error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Update component
export const updateComponent = async (req, res) => {
    try {
        const component = await Component.findById(req.params.id);

        if (!component) {
            return res.status(404).json({
                success: false,
                message: 'Component not found'
            });
        }

        if (component.createdBy.toString() !== req.session.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }

        // Allow updating elementsDescription too
        const { title, category, description, htmlCode, elementsDescription, isPublished } = req.body;

        const updateData = {};
        if (title) updateData.title = title;
        if (category) updateData.category = category;
        if (description) updateData.description = description;
        if (htmlCode) updateData.htmlCode = htmlCode;
        if (elementsDescription) updateData.elementsDescription = elementsDescription;  // ✅ Added this
        if (typeof isPublished !== 'undefined') updateData.isPublished = isPublished;

        const updated = await Component.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        res.status(200).json({
            success: true,
            data: updated
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Delete component
export const deleteComponent = async (req, res) => {
    try {
        const component = await Component.findById(req.params.id);

        if (!component) {
            return res.status(404).json({
                success: false,
                message: 'Component not found'
            });
        }

        // ✅ Changed to .id instead of ._id
        if (component.createdBy.toString() !== req.session.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }

        await Component.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Component deleted'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Like component
export const toggleLike = async (req, res) => {
    try {
        const component = await Component.findById(req.params.id);

        if (!component) {
            return res.status(404).json({
                success: false,
                message: 'Component not found'
            });
        }

        component.likes += 1;
        await component.save();

        res.status(200).json({
            success: true,
            likes: component.likes
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

```

### src/controllers/user.controller.js

```javascript
import * as userService from "../services/user.service.js";

export const createUser = async (req, res) => {
    try {
        const user = await userService.createUser(req.body);
        res.status(201).json(user);
    } catch (error) {
        res.status(404).json(error);
    }
};

export const getUsers = async (req, res) => {
    const users = await userService.getAllUsers();
    res.json(users);
};

export const userSignIn = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        const user = await userService.getUserByEmail(email);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Remove sensitive fields
        const { password, ...userData } = user.toObject();

        req.session.user = {
            id: userData._id,
            last_name: userData.name,
            email: userData.email,
        };

        return res.status(200).json({ message: "Sign-in successful!", userData: userData });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};


```

### src/middlewares/auth.js

```javascript
const ensureAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect("/auth/sign-in");
    }
    next();
};

const redirectIfAuthenticated = (req, res, next) => {
    if (req.session.user && req.originalUrl !== "/auth/sign-out") {
        return res.redirect("/");
    }
    next();
};

const noCacheAuth = (req, res, next) => {
    res.set(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, private, max-age=0"
    );
    res.set("Pragma", "no-cache");
    res.set("Expires", "-1");
    next();
};

const ensureProfessor = (req, res, next) => {
    if (!req.session.user || req.session.user.role !== "professor") {
        return res.status(403).send("Access denied");
    }
    next();
};

const setSessionLocals = (req, res, next) => {
    res.locals.user = req.session?.user || null;
    next();
};

const ensureAuthAPI = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({
            success: false,
            message: 'Please login to continue'
        });
    }
    next();
};

export {
    ensureAuth,
    ensureAuthAPI,
    ensureProfessor,
    setSessionLocals,
    redirectIfAuthenticated,
    noCacheAuth,
};

```

### src/middlewares/lastSeen.js

```javascript
const lastSeenMiddleware = (req, res, next) => {
    if (req.session && req.session.user) {
        req.session.lastSeen = Date.now();
    }
    next();
};

export default lastSeenMiddleware;

```

### src/middlewares/methodOverride.js

```javascript
const methodOverride = (req, res, next) => {

    if (req.body && req.body._method) {
        req.method = req.body._method.toUpperCase();
        delete req.body._method;
    }
    next();
};

export { methodOverride }

```

### src/middlewares/requestLogger.js

```javascript
/**
 * Logs every request with timestamp, method, path and auth status.
 */
const requestLogger = (req, res, next) => {
    const timestamp = new Date().toUTCString();
    let authStatus = "Non-Authenticated";

    if (req.session && req.session.user) {
        const role =
            req.session.user.role === "professor" ? "professor" : "student";
        authStatus = `Authenticated ${role}`;
    }

    console.log(
        `[${timestamp}]: ${req.method} ${req.originalUrl} (${authStatus})`
    );

    next();
};

export { requestLogger };

```

### src/middlewares/sessionConfig.js

```javascript
import session from 'express-session';
import dotenv from 'dotenv';
import MongoStore from "connect-mongo";
import { mongoConfig } from '../config/settings.js';

dotenv.config();

const sessionConfig = session({
    name: 'SlackOverflowSession',
    secret: process.env.SESSION_SECRET || 'team18-secret-key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: mongoConfig.serverUrl,
        dbName: mongoConfig.database,
        collectionName: "sessions",
        ttl: 60 * 60 * 24 * 2,
    }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 2,
    },
});

export { sessionConfig }

```

### src/models/component.model.js

```javascript
import mongoose from "mongoose";

const componentSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true
        },
        category: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true,
            trim: true
        },
        htmlCode: {
            type: String,
            required: true
        },
        elementsDescription: {  // ✅ Added this field
            type: [mongoose.Schema.Types.Mixed],
            default: []
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        views: {
            type: Number,
            default: 0
        },
        likes: {
            type: Number,
            default: 0
        },
        isPublished: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

export default mongoose.model("Component", componentSchema);

```

### src/models/user.model.js

```javascript
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        name: { type: String },
        email: { type: String, require: true },
        password: { type: String },
    },
    { timestamps: true }
);

export default mongoose.model("User", userSchema);

```

### src/processes/generateOTP.js

```javascript
import * as validator from "../utils/validator.js";
import sendEmail from "./sendEmail.js";
// TODO: Create one for the students also!!!!!!

import { fileURLToPath } from "url";
import fs from "fs/promises";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const renderTemplateLiteral = (template, vars) => {
    // Evaluates `template` as a JS template literal with vars in scope.
    // Only use with trusted templates.
    const fn = new Function(...Object.keys(vars), `return \`${template}\`;`);
    return fn(...Object.values(vars));
};

/**
 * Generate a random number between 100,000 (inclusive) and 999,999 (inclusive)
 * @returns
 */
const generateRandomSixDigitNumber = () => {
    return Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;
};

export const sendOTPEmail = async (email) => {
    email = validator.isValidEmail(email);
    const temp_name = email.split("@")[0];
    const otp = generateRandomSixDigitNumber();
    const filePath = path.resolve(__dirname, "../public/htmls/otpMailer.html");
    let html = await fs.readFile(filePath, "utf-8");
    html = renderTemplateLiteral(html, { otp, name: temp_name });
    await sendEmail(
        email,
        "SlackOverflow OTP confirmation",
        `Good day ${temp_name}! \nPlease use the below OTP to authenticate yourself to the website.`,
        html
    );
    return otp;
};

```

### src/processes/sendEmail.js

```javascript
import "dotenv/config";
import * as nodemailer from "nodemailer";
import { google } from "googleapis";

const GMAIL_ID = (process.env.GMAIL_ID || "").trim();
const CLIENT_ID = (process.env.EMAIL_CLIENT_ID || "").trim();
const CLIENT_SECRET = (process.env.EMAIL_CLIENT_SECRET || "").trim();
const REFRESH_TOKEN = (process.env.EMAIL_REFRESH_TOKEN || "").trim();

if (!GMAIL_ID || !CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    throw new Error(
        `Missing envs: ${JSON.stringify({
            GMAIL_ID: !!GMAIL_ID,
            CLIENT_ID: !!CLIENT_ID,
            CLIENT_SECRET: !!CLIENT_SECRET,
            REFRESH_TOKEN: !!REFRESH_TOKEN,
        })}`
    );
}

const oAuth2 = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
oAuth2.setCredentials({ refresh_token: REFRESH_TOKEN });

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        type: "OAuth2",
        user: GMAIL_ID,
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        refreshToken: REFRESH_TOKEN, // must be minted with scope https://mail.google.com/
    },
});

/**
 * Send an email to the receiver using nodemailer
 * @param {*} to
 * @param {*} subject
 * @param {*} text
 * @param {*} html
 */
const sendEmail = async (to, subject, text, html) => {
    try {
        const { token: accessToken } = await oAuth2.getAccessToken();

        const info = await transporter.sendMail({
            from: `"SlackOverflow" <${GMAIL_ID}>`,
            to,
            subject,
            text: text || "Hello from SlackOverflow mailer.",
            html: html || "<p>Hello from SlackOverflow mailer.</p>",
            envelope: { from: GMAIL_ID, to }, // align SMTP MAIL FROM / RCPT TO
            dsn: {
                id: String(Date.now()),
                return: "headers",
                notify: ["failure", "delay"],
                recipient: to,
            },
            headers: { "X-Entity-Ref-ID": String(Date.now()) },
            auth: {
                user: GMAIL_ID,
                accessToken, // explicit fresh access token
                refreshToken: REFRESH_TOKEN,
            },
        });

        console.log(
            "Message sent:",
            info.messageId,
            "accepted:",
            info.accepted,
            "rejected:",
            info.rejected
        );
        return info;
    } catch (err) {
        console.error("sendEmail failed:", err?.response?.data || err);
        throw err;
    }
};

export default sendEmail;

```

### src/public/css/ag-grid.css

```css
.ag-theme-alpine {
    --ag-header-foreground-color: black;
    --ag-header-background-color: rgba(240, 124, 0, 0);
    --ag-border-color: transparent;
    --ag-row-border: 2px solid var(--primary);
    --ag-background-color: white;
    --ag-row-hover-color: white;
    --ag-input-border: 2px solid var(--primary);
}

.ag-theme-alpine .ag-header-cell-resize {
    background-color: var(--primary);
    width: 2px;
    height: 15px;
    right: 0;
    top: 31%;
    bottom: 20%;
    opacity: 1;
}

.ag-theme-alpine .ag-paging-panel {
    border: 2px solid rgb(236, 233, 233);
    border-right: none;
    border-bottom: none;
    border-left: none;
    border-radius: 0;
    padding: 4px;
}



.ag-checkbox-input-wrapper.ag-checked {
    background-color: var(--primary) !important;

    border-color: var(--primary) !important;
}

.ag-checkbox-input-wrapper:focus-within {
    border-color: var(--primary);
    box-shadow: 0 0 0 2px var(--primary);
}

.ag-checkbox-input-wrapper:focus-within .ag-icon-checkbox-checked,
.ag-checkbox-input-wrapper:focus-within .ag-icon-checkbox-unchecked {
    color: var(--primary);
}

```

### src/public/css/quill.css

```css


/* Inner editable area (default for all editors) */
#updateAnswerEditor .ql-editor,
#updateQuestionEditor .ql-editor,
#questionEditor .ql-editor,
#answerEditor .ql-editor {
    max-height: 400px;
    overflow-y: auto;
    font-size: 16px;
    padding-top: 2px;
    padding-bottom: 2px;
}

/* Placeholder styling */
.ql-editor.ql-blank::before {
    color: #9ca3af;
    font-style: normal;
}

/* Remove default borders so it blends with your card */
.ql-toolbar.ql-snow,
.ql-container.ql-snow {
    border: none;
}

/* Icon + picker color */
.ql-snow .ql-stroke {
    stroke: #4b5563;
}

.ql-snow .ql-fill {
    fill: #4b5563;
}

.ql-snow .ql-picker-label,
.ql-snow .ql-picker-item {
    color: #4b5563;
}

/* Open pickers upwards so they don't get cut off */
.ql-snow .ql-picker.ql-expanded .ql-picker-options {
    bottom: 100%;
    top: auto;
    margin-bottom: 4px;
}

/* Tooltip (link / video dialog) */
.ql-tooltip {
    z-index: 1000;
    left: 8px !important;
    transform: none !important;
}

/* Nicer tooltip look */
.ql-snow .ql-tooltip {
    border-radius: 0.5rem;
    box-shadow: 0 10px 25px rgba(15, 23, 42, 0.12);
    border-color: #e5e7eb;
    font-size: 0.875rem;
}

.ql-snow .ql-tooltip button {
    border-radius: 9999px;
    padding: 0.2rem 0.6rem;
}

.ql-snow .ql-tooltip button.ql-action {
    background-color: #f0bd66;
    color: #ffffff;
    border-color: transparent;
}

.ql-snow .ql-tooltip button.ql-remove {
    color: #6b7280;
    border-color: #e5e7eb;
}

/* Let JS control the height; just enforce a sane minimum */
#questionEditor {
    min-height: 60px;
}

/* Inner editor fills that box and scrolls */
#questionEditor .ql-editor {
    height: 100%;
    max-height: 100%;
    overflow-y: auto;
}

```

### src/public/css/style.css

```css
/* Remove AG Grid blue focus/selection outline in Course Management grid */
#courseManagementGrid .ag-cell-focus,
#courseManagementGrid .ag-cell-range-single-cell,
#courseManagementGrid .ag-cell:focus {
  outline: none !important;
  border: none !important;
}

#studentManagementGrid .ag-cell-focus,
#studentManagementGrid .ag-cell-range-single-cell,
#studentManagementGrid .ag-cell:focus {
  outline: none !important;
  border: none !important;
}

:root {
  --primary: #000000;
  --secondary: #e0e0e0;
  --tertiary: #ffffff;
}

```

### src/public/js/auth.js

```javascript
const handleSignIn = (event) => {
    event.preventDefault();
    const email = event.target.email.value.trim();
    const password = event.target.password.value.trim();

    const button = event.target.querySelector("button[type='submit']");
    button.disabled = true;
    button.innerText = "Signing in...";

    fetch("/users/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    })
        .then(async (res) => {
            const body = await res.json();
            return { status: res.status, body };
        })
        .then(({ status, body }) => {
            if (status !== 200) {
                showToast(body.message || "unknown error.", "error");
                button.disabled = false;
                button.innerText = "Sign In";
                return;
            }

            showToast("Login successful! Redirecting...", "success");

            setTimeout(() => {
                window.location.href = "/";
            }, 1200);
        })
        .catch((err) => {
            console.error("handleSignIn error:", err);
            showToast("Server error. Please try again.", "error");
            button.disabled = false;
            button.innerText = "Sign In";
        });

    return false;
};

const handleSignUp = (event) => {
    event.preventDefault();

    const form = event.target;
    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value.trim();
    const confirmPassword = form.confirmPassword.value.trim();

    // front-end confirm password check
    if (!password || !confirmPassword) {
        showToast("Password and Confirm Password are required.", "error");
        return false;
    }

    if (password !== confirmPassword) {
        showToast("Passwords do not match.", "error");
        return false;
    }

    const button = form.querySelector("button[type='submit']");
    button.disabled = true;
    button.innerText = "Signing up...";

    fetch("/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
    })
        .then(async (res) => {
            const body = await res.json();
            return { status: res.status, body };
        })
        .then(({ status, body }) => {
            if (status !== 200 && status !== 201) {

                const message =
                    body?.message === "user not found"
                        ? "User not found"
                        : body?.message || body?.errorResponse?.errmsg;

                showToast(message, "error");
                button.disabled = false;
                button.innerText = "Sign Up";
                return;
            }


            showToast("Signup successful!", "success");
            button.disabled = false;
            button.innerText = "Sign Up";

            setTimeout(() => {
                window.location.href = "/auth/sign-in";
            }, 800);
        })
        .catch((err) => {
            console.error("handleSignUp error:", err);
            showToast("Server error. Please try again.", "error");
            button.disabled = false;
            button.innerText = "Sign Up";
        });

    return false;
};

const handleVerification = (event) => {
    event.preventDefault();

    const otpInputs = document.querySelectorAll(".otp-input");
    const otp = Number(
        Array.from(otpInputs)
            .map((i) => i.value.trim())
            .join("")
    );

    const email = localStorage.getItem("otpEmail");
    const button = event.target.querySelector("button[type='submit']");
    console.log(otp);
    if (!otp || otp.length < 4) {
        showToast("Please enter the full 6-digit OTP.", "error");
        return;
    }

    button.disabled = true;
    button.innerText = "Verifying...";

    fetch("/users/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
    })
        .then(async (res) => {
            const body = await res.json();
            return { status: res.status, body };
        })
        .then(({ status, body }) => {
            if (status !== 200) {
                showToast(body.message || "Invalid or expired OTP.", "error");
                button.disabled = false;
                button.innerText = "Verify Account";
                return;
            }

            localStorage.removeItem("otpEmail");

            showToast("Verification successful! Redirecting...", "success");

            setTimeout(() => {
                window.location.href = "/auth/sign-in";
            }, 1200);
        })
        .catch((err) => {
            console.error("handleVerification error:", err);
            showToast("Server error. Please try again.", "error");
            button.disabled = false;
            button.innerText = "Verify Account";
        });

    return false;
};

```

### src/public/js/category.js

```javascript
// Category page specific functionality
// This file works alongside home.js and uses the existing createElementFromDescription function

(function () {
    'use strict';

    // Render component from elementsDescription
    // Uses the global createElementFromDescription from home.js
    function renderComponent(componentId, elementsDescription) {
        const previewInner = document.getElementById(`preview-inner-${componentId}`);
        if (!previewInner || !elementsDescription) return;

        // Clear existing content
        previewInner.innerHTML = '';

        // Render each element from description
        // Use the global function from home.js
        if (typeof createElementFromDescription === 'function') {
            elementsDescription.forEach(description => {
                const element = createElementFromDescription(description, false);
                previewInner.appendChild(element);
            });

            // Fix positioning issues after render
            setTimeout(() => {
                fixComponentPositioning(componentId);
            }, 50);
        } else {
            console.error('createElementFromDescription is not defined. Make sure home.js is loaded first.');
        }
    }

    // Fix positioning issues in rendered components
    function fixComponentPositioning(componentId) {
        const previewInner = document.getElementById(`preview-inner-${componentId}`);
        const preview = document.getElementById(`preview-${componentId}`);
        if (!previewInner) return;

        // Make preview container a positioning context
        if (preview) {
            preview.style.position = 'relative';
            preview.style.overflow = 'hidden';
        }

        // Make inner container a positioning context
        previewInner.style.position = 'relative';

        // Find and fix elements with problematic positioning
        const allElements = previewInner.querySelectorAll('*');

        allElements.forEach(el => {
            const computedStyle = window.getComputedStyle(el);
            const position = computedStyle.position;

            // Convert fixed to absolute
            if (position === 'fixed' || el.classList.contains('fixed')) {
                el.style.position = 'absolute';

                // Remove Tailwind fixed classes
                el.classList.forEach(cls => {
                    if (cls.includes('fixed')) {
                        el.classList.remove(cls);
                    }
                });
            }

            // Convert sticky to relative
            if (position === 'sticky' || el.classList.contains('sticky')) {
                el.style.position = 'relative';
                el.style.top = 'auto';

                // Remove Tailwind sticky classes
                el.classList.forEach(cls => {
                    if (cls.includes('sticky')) {
                        el.classList.remove(cls);
                    }
                });
            }

            // Cap z-index to prevent overlapping platform UI
            const zIndex = parseInt(computedStyle.zIndex);
            if (zIndex > 50) {
                el.style.zIndex = '10';
            }
        });
    }

    // Make functions globally available for onclick handlers
    window.toggleTab = function (id, tab) {
        const preview = document.getElementById(`preview-${id}`);
        const code = document.getElementById(`code-${id}`);
        const previewBtn = document.getElementById(`preview-btn-${id}`);
        const codeBtn = document.getElementById(`code-btn-${id}`);

        if (tab === "preview") {
            preview.classList.remove("hidden");
            code.classList.add("hidden");
            previewBtn.classList.add("bg-white", "shadow", "text-gray-900");
            codeBtn.classList.remove("bg-white", "shadow", "text-gray-900");
        } else {
            preview.classList.add("hidden");
            code.classList.remove("hidden");
            codeBtn.classList.add("bg-white", "shadow", "text-gray-900");
            previewBtn.classList.remove("bg-white", "shadow", "text-gray-900");
        }
    };

    // Copy code to clipboard
    window.copyCode = function (id) {
        const code = document.getElementById(`code-content-${id}`).innerText;
        navigator.clipboard.writeText(code).then(() => {
            // Visual feedback
            const btn = event.target.closest('button');
            const originalHTML = btn.innerHTML;
            btn.innerHTML = `
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
            `;
            setTimeout(() => {
                btn.innerHTML = originalHTML;
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy code:', err);
        });
    };

    // Set theme (light/dark)
    window.setTheme = function (id, theme) {
        const preview = document.getElementById(`preview-${id}`);
        if (!preview) return;

        if (theme === "dark") {
            preview.classList.remove("bg-white");
            preview.classList.add("bg-gray-900", "text-white");
        } else {
            preview.classList.remove("bg-gray-900", "text-white");
            preview.classList.add("bg-white");
        }
    };

    // Toggle width between full and centered
    window.toggleWidth = function (id) {
        const inner = document.getElementById(`preview-inner-${id}`);
        if (!inner) return;

        inner.classList.toggle("max-w-md");
        inner.classList.toggle("mx-auto");
    };

    // Toggle between mobile and desktop view
    window.toggleViewSize = function (id) {
        const inner = document.getElementById(`preview-inner-${id}`);
        if (!inner) return;

        const checkbox = document.getElementById(`view-toggle-${id}`);
        const isMobile = inner.classList.contains("max-w-md");

        if (isMobile) {
            // Switch to desktop view
            inner.classList.remove("max-w-md", "mx-auto");
            inner.classList.add("w-full");
            if (checkbox) checkbox.checked = true;
        } else {
            // Switch to mobile view
            inner.classList.remove("w-full");
            inner.classList.add("max-w-md", "mx-auto");
            if (checkbox) checkbox.checked = false;
        }
    };

    // Toggle fullscreen mode
    window.toggleComponentFullscreen = function (id) {
        const preview = document.getElementById(`preview-${id}`);
        if (!preview) return;

        if (!document.fullscreenElement) {
            preview.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    };

    // Initialize all components on page load
    document.addEventListener('DOMContentLoaded', () => {
        // Find all components with data-elements attribute
        const components = document.querySelectorAll('[data-component-id]');

        components.forEach(component => {
            const componentId = component.dataset.componentId;
            const elementsData = component.dataset.elements;

            if (elementsData) {
                try {
                    const elementsDescription = JSON.parse(elementsData);
                    renderComponent(componentId, elementsDescription);
                } catch (error) {
                    console.error(`Error parsing elements for component ${componentId}:`, error);
                    // Fallback: keep the HTML that was already rendered
                }
            }
        });
    });

})();

```

### src/public/js/home.js

```javascript

function updatePreview() {
    const html = document.getElementById('htmlEditor').value;
    const preview = document.getElementById('preview');
    const previewDoc = preview.contentDocument || preview.contentWindow.document;

    previewDoc.open();
    previewDoc.write(html);
    previewDoc.close();
}

const clearEditor = () => {
    if (confirm('Clear all content?')) {
        document.getElementById('htmlEditor').value = '';
        document.getElementById('preview').innerHTML = '';
    }
}

const createDescriptionFromElement = (element) => {
    const getAttributes = (element) => {
        const attrs = {};
        Array.from(element.attributes || []).forEach(attr => {
            attrs[attr.name] = attr.value;
        });
        return attrs;
    };

    const getNodeKind = (element) => {
        if (element.tagName === "BUTTON") return "action";
        if (element.tagName === "SVG" || element.tagName === "PATH") return "icon";
        if (element.localName.includes("-")) return "component";
        return "layout";
    };

    const description = {
        type: "element",
        tag: element.localName,
        kind: getNodeKind(element),
        attributes: getAttributes(element),
        classList: Array.from(element.classList),
        children: [],
    };

    // 🔥 PRESERVE ORDER (TEXT + ELEMENTS)
    element.childNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            if (node.textContent.trim()) {
                description.children.push({
                    type: "text",
                    content: node.textContent,
                });
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            description.children.push(createDescriptionFromElement(node));
        }
    });

    return description;
};



const createElementFromDescription = (
    description,
    isDraggable = false
) => {

    if (description.type === "text") {
        return document.createTextNode(description.content);
    }

    const SVG_TAGS = new Set(["svg", "path", "circle", "rect", "line", "g"]);

    const createElement = (tag) => {
        if (SVG_TAGS.has(tag)) {
            return document.createElementNS("http://www.w3.org/2000/svg", tag);
        }
        return document.createElement(tag);
    };

    const element = createElement(description.tag);

    /* classes */
    if (description.classList?.length) {
        element.classList.add(...description.classList);
    }

    /* attributes */
    Object.entries(description.attributes || {}).forEach(([k, v]) => {
        element.setAttribute(k, v);
    });

    /* draggable */
    if (isDraggable) {
        element.setAttribute("draggable", "true");
    }

    /* 🔥 PRESERVE ORDER */
    description.children?.forEach(child => {
        element.appendChild(
            createElementFromDescription(child, isDraggable)
        );
    });

    return element;
};




const handleChangeEditor = (e) => {
    const preview = document.getElementById("preview");

    // Clear previous content

    preview.innerHTML = ""

    const parser = new DOMParser();
    const dom = parser.parseFromString(e.target.value, "text/html");

    const elementsDescription = Array.from(dom.body.children).map(child =>
        createDescriptionFromElement(child)
    );
    console.log(elementsDescription)
    elementsDescription.forEach(description => {
        const element = createElementFromDescription(description, true);
        preview.appendChild(element);
    });
};



function makePreviewZoomable(previewId, options = {}) {
    const preview = document.getElementById(previewId);
    const previewParentId = document.getElementById("preview-wrapper");

    let zoom = 1;
    let position = { x: 0, y: 0 };
    let isDragging = false;
    let dragStart = { x: 0, y: 0 };
    let activeTool = options.activeTool || "HAND";

    preview.style.transformOrigin = "0 0";
    preview.style.cursor = "grab";

    function updateTransform() {
        preview.style.transform =
            `translate(${position.x}px, ${position.y}px) scale(${zoom})`;
    }

    function zoomAtPoint(newZoom, clientX, clientY) {
        const rect = preview.getBoundingClientRect();

        const mouseX = clientX - rect.left;
        const mouseY = clientY - rect.top;

        const scaleFactor = newZoom / zoom;

        position.x -= mouseX * (scaleFactor - 1);
        position.y -= mouseY * (scaleFactor - 1);

        zoom = newZoom;
        updateTransform();
    }

    function handleWheel(e) {
        e.preventDefault();

        if (e.ctrlKey || e.metaKey) {
            const delta = e.deltaY < 0 ? 1.1 : 0.9;
            const newZoom = Math.max(0.02, Math.min(10, zoom * delta));

            zoomAtPoint(newZoom, e.clientX, e.clientY);
        } else {
            position.x -= e.deltaX;
            position.y -= e.deltaY;
            updateTransform();
        }
    }

    function handleMouseDown(e) {
        if (activeTool === "HAND") {
            isDragging = true;
            dragStart = {
                x: e.clientX - position.x,
                y: e.clientY - position.y,
            };
            preview.style.cursor = "grabbing";
        }
    }

    function handleMouseMove(e) {
        if (!isDragging) return;
        position.x = e.clientX - dragStart.x;
        position.y = e.clientY - dragStart.y;
        updateTransform();
    }

    function handleMouseUp() {
        if (activeTool === "HAND") {
            isDragging = false;
            preview.style.cursor = "grab";
        }
    }

    function handleKeyDown(e) {
        if ((e.ctrlKey || e.metaKey) && (e.key === "=" || e.key === "-")) {
            e.preventDefault();
            const delta = e.key === "=" ? 1.1 : 0.9;
            const newZoom = Math.max(0.02, Math.min(10, zoom * delta));

            zoomAtPoint(newZoom, window.innerWidth / 2, window.innerHeight / 2);
        }
    }

    preview.addEventListener("wheel", handleWheel, { passive: false });
    previewParentId.addEventListener("wheel", handleWheel, { passive: false });
    preview.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("keydown", handleKeyDown);

    return {
        setZoom: (value, cx = 0, cy = 0) => zoomAtPoint(value, cx, cy),
        setPosition: (x, y) => {
            position = { x, y };
            updateTransform();
        },
        getZoom: () => zoom,
        getPosition: () => ({ ...position }),
        setActiveTool: (tool) => {
            activeTool = tool;
            preview.style.cursor = tool === "HAND" ? "grab" : "default";
        }
    };
}


const previewController = makePreviewZoomable("preview");

// programmatically zoom to 150%
previewController.setZoom(0.5);

// programmatically pan
previewController.setPosition(0, 0);

const handleMovement = () => {
    const movementButton = document.getElementById("movementButton")
    const movementButton2 = document.getElementById("movementButton2")
    const preview = document.getElementById("preview");
    const styleId = "previewPointerStyle";
    const existingStyle = document.getElementById(styleId);

    if (existingStyle) {
        // Remove if exists
        existingStyle.remove();
        movementButton.classList.remove("bg-slate-200")
        movementButton.classList.add("text-white")
        movementButton2.classList.remove("bg-slate-200")
        movementButton2.classList.add("text-white")
        previewController.setActiveTool("SELECT");

    } else {
        movementButton.classList.add("bg-slate-200")
        movementButton.classList.remove("text-white")
        movementButton2.classList.add("bg-slate-200")
        movementButton2.classList.remove("text-white")
        // Add if not exists
        const style = document.createElement("style");
        style.id = styleId;
        style.textContent = `
            #preview:hover * {
                pointer-events: none;
            }
        `;
        document.head.appendChild(style);
        previewController.setActiveTool("HAND");
    }

}

const handleDisplaySize = (e) => {
    const preview = document.querySelector('#preview');

    // Remove all width classes that start with "w-"
    preview.classList.forEach(cls => {
        if (cls.startsWith('w-')) {
            preview.classList.remove(cls);
        }
    });

    if (e.target.checked === false) {
        preview.classList.add('w-fit');

    } else {
        preview.classList.add('w-screen');
    }

}

document.addEventListener("fullscreenchange", () => {
    const FSTools = document.getElementById("fullScreenTools");

    if (!document.fullscreenElement) {
        // Exited fullscreen (ESC or programmatic)
        FSTools.classList.add("hidden");
    } else {
        // Entered fullscreen
        FSTools.classList.remove("hidden");
    }
});

const togglePreviewFullscreen = () => {
    const wrapper = document.getElementById("preview-wrapper");

    if (!document.fullscreenElement) {
        wrapper.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
};


let isDetailsOpen = false;

const handleNext = () => {

    const componentForm = document.getElementById("componentForm");
    const htmlEditor = document.getElementById("htmlEditor");
    const details = document.getElementById("detailsPanel");
    const cancelBtn = document.getElementById("cancelBtn");
    const nextBtn = document.getElementById("nextBtn");
    const backBtn = document.getElementById("backBtn");
    const submitBtn = document.getElementById("submitBtn");

    if (!componentForm.htmlEditor.checkValidity()) {
        componentForm.htmlEditor.reportValidity();
        return;
    }

    details.classList.remove("hidden");
    cancelBtn.classList.add("hidden")
    backBtn.classList.remove("hidden");
    nextBtn.classList.add("hidden")
    submitBtn.classList.remove("hidden")

}

const handleBack = () => {
    const details = document.getElementById("detailsPanel");
    const cancelBtn = document.getElementById("cancelBtn");
    const nextBtn = document.getElementById("nextBtn");
    const backBtn = document.getElementById("backBtn");
    const submitBtn = document.getElementById("submitBtn");

    details.classList.add("hidden");
    cancelBtn.classList.remove("hidden")
    backBtn.classList.add("hidden");
    nextBtn.classList.remove("hidden")
    submitBtn.classList.add("hidden")
}

const handleClose = () => {
    const dialog = document.getElementById("dialog");
    document.getElementById('htmlEditor').value = '';
    document.getElementById('preview').innerHTML = '';
    dialog.close()
}


const handleSave = async (e) => {
    e.preventDefault();

    const form = e.target;
    const submitBtn = document.getElementById("submitBtn");

    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    // Get html editor value
    const htmlCode = document.getElementById('htmlEditor').value;

    const parser = new DOMParser();
    const dom = parser.parseFromString(htmlCode, "text/html");

    const elementsDescription = Array.from(dom.body.children).map(child =>
        createDescriptionFromElement(child)
    );

    // ✅ Get all form fields automatically
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // Add extra values
    data.htmlCode = htmlCode;
    data.elementsDescription = elementsDescription;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    try {
        const response = await fetch('/api/components', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message);
        }

        alert('Component saved successfully!');
        handleClose();
        window.location.reload();

    } catch (error) {
        console.error('Save error:', error);
        alert(error.message || 'Failed to save component');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit';
    }
};



```

### src/public/js/tailwind.config.js

```javascript
tailwind.config = {
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                primary: "var(--primary)",
                secondary: 'var(--secondary)',
                tertiary: 'var(--tertiary)',

            },
        },
    },
};

```

### src/public/js/theme.js

```javascript
const applyCustomTheme = () => {
    const primary = document.getElementById('primaryColor').value;
    const secondary = document.getElementById('secondaryColor').value;
    const tertiary = document.getElementById('tertiaryColor').value;


    document.documentElement.style.setProperty('--primary', primary);
    document.documentElement.style.setProperty('--secondary', secondary);
    document.documentElement.style.setProperty('--tertiary', tertiary);
}

const handleThemeToggle = () => {
    themeDropdown = document.getElementById("themeDropdown");

    const isClosed = themeDropdown.classList.contains("hidden");

    if (isClosed) {
        themeDropdown.classList.remove(
            'hidden',
            "pointer-events-none"
        );
    } else {
        themeDropdown.classList.add(
            "hidden",
            "pointer-events-none"
        );
    }
}

```

### src/public/js/utils.js

```javascript
const showToast = (message, type = "info") => {
  const authToast = document.getElementById("auth-toast");
  const toast = document.createElement("div");
  toast.className =
    "px-5 py-3 rounded-lg shadow-md text-white text-sm flex items-center justify-between gap-4 animate-slide-in";

  if (type === "success") toast.classList.add("bg-green-500");
  else if (type === "error") toast.classList.add("bg-red-500");
  else toast.classList.add("bg-gray-700");

  toast.innerHTML = `
    <span>${message}</span>
    <button class="text-white text-lg leading-none focus:outline-none" onclick="this.parentElement.remove()">×</button>
  `;

  authToast.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("animate-slide-out");
    setTimeout(() => toast.remove(), 300);
  }, 20000);
}

const style = document.createElement("style");
style.textContent = `
  @keyframes slideIn {
    from { opacity: 0; transform: translateX(100%); }
    to { opacity: 1; transform: translateX(0); }
  }
  @keyframes slideOut {
    from { opacity: 1; transform: translateX(0); }
    to { opacity: 0; transform: translateX(100%); }
  }
  .animate-slide-in {
    animation: slideIn 0.4s ease forwards;
  }
  .animate-slide-out {
    animation: slideOut 0.3s ease forwards;
  }
`;

document.head.appendChild(style);

```

### src/routes/auth.routes.js

```javascript
import { Router } from "express";

const router = Router();

router.get("/sign-in", (req, res) => {
    return res.render("auth/signin", { layout: 'auth', title: 'Sign In' });
});

// Sign Out
router.get('/sign-out', (req, res) => {
    return req.session.destroy(() => {
        res.clearCookie('SlackOverflowSession');
        res.redirect('/auth/sign-in');
    });
});

// Sign Up
router.get("/sign-up", (req, res) => {
    return res.render("auth/signup", { layout: 'auth', title: "Sign Up" });
});

// OTP Verification
router.get("/verify-otp", (req, res) => {
    return res.render("auth/verification", { layout: 'auth', title: "OTP Verification" });
});

export default router;

```

### src/routes/component.routes.js

```javascript
import express from "express";
import {
    getAllComponents,
    getComponentById,
    createComponent,
    updateComponent,
    deleteComponent,
    toggleLike
} from "../controllers/component.controller.js";
import { ensureAuthAPI } from "../middlewares/auth.js";  // Changed import

const router = express.Router();

// Public routes
router.get("/", getAllComponents);
router.get("/:id", getComponentById);

// Protected routes - using ensureAuthAPI instead of ensureAuth
router.post("/", ensureAuthAPI, createComponent);
router.put("/:id", ensureAuthAPI, updateComponent);
router.delete("/:id", ensureAuthAPI, deleteComponent);
router.post("/:id/like", ensureAuthAPI, toggleLike);

export default router;

```

### src/routes/home.routes.js

```javascript
import express from "express";
import Component from "../models/component.model.js";

const router = express.Router();

// Category definitions with display names
const categories = {
    'marketing-hero': { name: 'Hero Sections', group: 'Marketing' },
    'marketing-hero-forms': { name: 'Hero Forms', group: 'Marketing' },
    'marketing-icons': { name: 'Icon Sections', group: 'Marketing' },
    'marketing-pricing': { name: 'Pricing Sections', group: 'Marketing' },
    'marketing-faq': { name: 'FAQ Sections', group: 'Marketing' },
    'marketing-blog': { name: 'Blog Sections', group: 'Marketing' },
    'marketing-testimonials': { name: 'Testimonials', group: 'Marketing' },
    'marketing-team': { name: 'Team Sections', group: 'Marketing' },
    'marketing-features': { name: 'Features', group: 'Marketing' },
    'marketing-announcements': { name: 'Announcement Banners', group: 'Marketing' },
    'marketing-cards': { name: 'Card Sections', group: 'Marketing' },
    'marketing-clients': { name: 'Clients Sections', group: 'Marketing' },
    'marketing-galleries': { name: 'Galleries', group: 'Marketing' },
    'marketing-timeline': { name: 'Timeline', group: 'Marketing' },
    'ui-dropdowns': { name: 'Dropdowns', group: 'UI Components' },
    'ui-selects': { name: 'Selects', group: 'UI Components' },
    'ui-buttons': { name: 'Button Groups', group: 'UI Components' },
    'ui-modals': { name: 'Modals', group: 'UI Components' },
    'ui-cookie-banners': { name: 'Cookie Banners', group: 'UI Components' },
    'navigation-navbars': { name: 'Navbars / Headers', group: 'Navigation' },
    'navigation-mega-menu': { name: 'Mega Menu', group: 'Navigation' },
    'layout-basic': { name: 'Layouts', group: 'Layout' },
    'forms-authentication': { name: 'Authentication', group: 'Forms' },
    'forms-feedback': { name: 'Feedback', group: 'Forms' },
    'forms-subscribe': { name: 'Subscribe', group: 'Forms' },
    'forms-textarea': { name: 'Textarea Inputs', group: 'Forms' },
    'pages-pricing': { name: 'Pricing Page', group: 'Pages' },
    'ecommerce-products': { name: 'Product Listings', group: 'E-Commerce' },
    'apps-general': { name: 'Application Components', group: 'Applications' },
    'apps-invoice': { name: 'Invoice', group: 'Applications' },
    'apps-tables': { name: 'Tables', group: 'Applications' },
    'apps-stats': { name: 'Stats', group: 'Applications' },
    'apps-charts': { name: 'Charts', group: 'Applications' },
    'apps-ai-prompt': { name: 'AI Prompt', group: 'Applications' },
    'footer-contact': { name: 'Contact Sections', group: 'Footer' },
    'footer-footers': { name: 'Footers', group: 'Footer' }
};

// Home page - Shows only categories that have components
router.get("/", async (req, res) => {
    try {
        const components = await Component.find({ isPublished: true }).lean();

        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        const categoryCounts = {};
        const categoryNewCounts = {};

        components.forEach(component => {
            const cat = component.category;
            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

            if (new Date(component.createdAt) >= oneMonthAgo) {
                categoryNewCounts[cat] = (categoryNewCounts[cat] || 0) + 1;
            }
        });

        const categoryCards = Object.keys(categoryCounts)
            .filter(key => categoryCounts[key] > 0)
            .map(key => ({
                slug: key,
                name: categories[key]?.name || key,
                group: categories[key]?.group || 'Other',
                count: categoryCounts[key],
                newCount: categoryNewCounts[key] || 0,
                hasNew: categoryNewCounts[key] > 0
            }));

        res.status(200).render("main/home", {
            activePage: 'home',
            layout: 'main',
            title: 'Tailwind UI Components',
            user: req.session.user || null,
            categories: categoryCards,
            totalComponents: components.length  // ✅ Add total count
        });
    } catch (error) {
        console.error('Error loading home page:', error);
        res.status(500).render("error", {
            layout: "main",
            title: "Error",
            message: "Failed to load components",
        });
    }
});

// Category detail page - Shows components in that category
router.get("/category/:category", async (req, res) => {
    try {
        const { category } = req.params;

        // Get all components for counts
        const allComponents = await Component.find({ isPublished: true }).lean();

        // Get category counts for sidebar
        const categoryCounts = {};
        allComponents.forEach(component => {
            categoryCounts[component.category] = (categoryCounts[component.category] || 0) + 1;
        });

        // Build sidebar categories list
        const allCategories = Object.keys(categoryCounts)
            .filter(key => categoryCounts[key] > 0)
            .map(key => ({
                slug: key,
                name: categories[key]?.name || key,
                count: categoryCounts[key],
                isActive: key === category
            }));

        // Get components for current category
        const components = await Component.find({
            category: category,
            isPublished: true
        })
            .populate('createdBy', 'name email last_name')
            .sort('-createdAt')
            .lean();

        const categoryInfo = categories[category];

        if (!categoryInfo) {
            return res.status(404).render("error", {
                layout: "main",
                title: "Category Not Found",
                message: "The category you're looking for doesn't exist.",
            });
        }

        // Mark which components are new
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        components.forEach(component => {
            component.isNew = new Date(component.createdAt) >= oneMonthAgo;
        });

        res.status(200).render("main/category-detail", {
            activePage: 'category',
            layout: 'main',
            title: categoryInfo.name,
            user: req.session.user || null,
            components: components,
            categoryName: categoryInfo.name,
            categorySlug: category,
            allCategories: allCategories
        });
    } catch (error) {
        console.error('Error loading category:', error);
        res.status(500).render("error", {
            layout: "main",
            title: "Error",
            message: "Failed to load category",
        });
    }
});

// Component detail page
router.get("/component/:id", async (req, res) => {
    try {
        const component = await Component.findById(req.params.id)
            .populate('createdBy', 'name email last_name');

        if (!component) {
            return res.status(404).render("error", {
                layout: "main",
                title: "Component Not Found",
                message: "The component you're looking for doesn't exist.",
            });
        }

        component.views += 1;
        await component.save();

        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        component.isNew = new Date(component.createdAt) >= oneMonthAgo;

        res.status(200).render("main/component-detail", {
            activePage: 'component',
            layout: 'main',
            title: component.title,
            user: req.session.user || null,
            component: component
        });
    } catch (error) {
        console.error('Error loading component:', error);
        res.status(500).render("error", {
            layout: "main",
            title: "Error",
            message: "Failed to load component",
        });
    }
});

export default router;

```

### src/routes/index.js

```javascript
import usersRoutes from "./user.routes.js";
import authRoutes from "./auth.routes.js";
import componentRoutes from "./component.routes.js";
import homeRoutes from "./home.routes.js";

import {
    ensureAuth,
    redirectIfAuthenticated,
    noCacheAuth,
} from "../middlewares/auth.js";

const constructorMethod = (app) => {
    app.use("/users", usersRoutes);
    app.use("/auth", redirectIfAuthenticated, noCacheAuth, authRoutes)
    app.use("/api/components", componentRoutes);


    // Home page
    app.use("/", homeRoutes);


    // Add this temporary debug route to your routes/index.js
    app.get("/api/debug/session", ensureAuth, (req, res) => {
        res.json({
            fullSession: req.session,
            user: req.session.user,
            userId: req.session.user?._id,
            userKeys: Object.keys(req.session.user || {})
        });
    });

    app.use("/{*splat}", (req, res) => {
        res.status(404).render("error", {
            layout: "auth",
            title: "Page Not Found",
            message: "The page you requested could not be found.",
        });
    });
};
export default constructorMethod;

```

### src/routes/user.routes.js

```javascript
import { Router } from "express";
import { getUsers, createUser, userSignIn } from "../controllers/user.controller.js";

const router = Router();

router.route("/").get(getUsers).post(createUser)

router.route("/sign-in").post(userSignIn)



export default router;

```

### src/server.js

```javascript
import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import connectDB from "./config/mongoConnection.js";

const PORT = process.env.PORT || 3000;

connectDB();

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

```

### src/services/user.service.js

```javascript
import User from "../models/user.model.js";

/* CREATE */
export const createUser = async (data) => {
    return await User.create(data);
};

/* READ */
export const getAllUsers = async () => {
    return await User.find();
};

export const getUserByEmail = async (email) => {
    return User.findOne({ email });
};

export const getUserById = async (id) => {
    return await User.findById(id);
};

/* UPDATE */
export const updateUser = async (id, data) => {
    return await User.findByIdAndUpdate(id, data, { new: true });
};

/* DELETE */
export const deleteUser = async (id) => {
    return await User.findByIdAndDelete(id);
};

```

### src/utils/handlebars-helpers.js

```javascript
export const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};

export const substring = (str, start, end) => {
    if (!str) return '';
    return str.substring(start, end).toUpperCase();
};

// handlebars-helpers.js
// Add this to your server configuration where you register Handlebars helpers

export function registerHandlebarsHelpers(handlebars) {
    // JSON serialization helper for passing data to JavaScript
    handlebars.registerHelper('json', function (context) {
        return JSON.stringify(context);
    });

    // Substring helper (if not already registered)
    handlebars.registerHelper('substring', function (str, start, end) {
        if (!str) return '';
        return str.substring(start, end);
    });

    // Additional helpers can be added here...
}

// If you're using a different setup, here's the standalone version:
export const jsonHelper = function (context) {
    return JSON.stringify(context);
};

```

### src/views/auth/signin.handlebars

```
<div class="w-full max-w-2xl px-5 mx-auto">
  <div class="bg-white rounded-xl shadow-md p-12 px-20">
    <h1 class="text-3xl font-semibold text-gray-900 text-center mb-3">Sign In</h1>
    <p class="text-gray-400 text-center mb-10">Sign in below to access your account</p>

    <!-- Home Button -->
    <div class="text-center mb-6">
      <a 
        href="/"
        class="inline-block px-5 py-2.5 text-sm font-medium text-[#F0BD66] border border-[#F0BD66] rounded-lg 
               hover:bg-[#F0BD66] hover:text-white transition-colors duration-200"
      >
        Go to Home
      </a>
    </div>

    <div id="toast" class="hidden mb-6 p-4 rounded-lg text-sm"></div>

    <form class="space-y-4" onsubmit="handleSignIn(event)">
      <div>
        <input 
          type="email" 
          name="email" 
          placeholder="Email Address"
          class="w-full px-4 py-3.5 text-gray-900 placeholder-gray-300 bg-white border-b-2 border-gray-200 
                 focus:border-amber-500 focus:outline-none transition-colors"
          required
        >
      </div>

      <div>
        <input 
          type="password" 
          name="password" 
          placeholder="Password"
          class="w-full px-4 py-3.5 text-gray-900 placeholder-gray-300 bg-white border-b-2 border-gray-200 
                 focus:border-amber-500 focus:outline-none transition-colors"
          required
        >
      </div>

      <button 
        type="submit"
        class="w-full mt-6 py-4 text-white font-medium bg-[#F0BD66] rounded-lg 
               hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
      >
        Sign in
      </button>

      <p class="text-center text-sm text-gray-400 mt-6">
        Don't have an account yet?
        <a href="/auth/sign-up" class="text-[#F0BD66] font-medium hover:text-amber-600 transition-colors">
          Sign up
        </a>
      </p>
    </form>
  </div>
</div>

```

### src/views/auth/signup.handlebars

```
<div class="w-full max-w-2xl px-5 mx-auto">
  <div class="bg-white rounded-xl shadow-md p-12 px-20">
    <h1 class="text-3xl font-semibold text-gray-900 text-center mb-3">Sign Up</h1>
    <p class="text-gray-400 text-center mb-10">Sign up below to create a new account</p>

    <!-- Home Button -->
    <div class="text-center mb-6">
      <a href="/" class="inline-block px-5 py-2.5 text-sm font-medium text-[#F0BD66] border border-[#F0BD66] rounded-lg 
               hover:bg-[#F0BD66] hover:text-white transition-colors duration-200">
        Go to Home
      </a>
    </div>

    <div id="toast" class="hidden mb-6 p-4 rounded-lg text-sm"></div>

    <form class="space-y-4" onsubmit="handleSignUp(event)">
      <div>
        <input type="text" name="name" placeholder="John Doe" class="w-full px-4 py-3.5 text-gray-900 placeholder-gray-300 bg-white border-b-2 border-gray-200 
                 focus:border-amber-500 focus:outline-none transition-colors" required>
      </div>
      <div>
        <input type="email" name="email" placeholder="Email Address" class="w-full px-4 py-3.5 text-gray-900 placeholder-gray-300 bg-white border-b-2 border-gray-200 
                 focus:border-amber-500 focus:outline-none transition-colors" required>
      </div>

      <div>
        <input type="password" name="password" placeholder="Password" class="w-full px-4 py-3.5 text-gray-900 placeholder-gray-300 bg-white border-b-2 border-gray-200 
                 focus:border-amber-500 focus:outline-none transition-colors" required>
      </div>

      <div>
        <input type="password" name="confirmPassword" placeholder="Confirm Password" class="w-full px-4 py-3.5 text-gray-900 placeholder-gray-300 bg-white border-b-2 border-gray-200 
                 focus:border-amber-500 focus:outline-none transition-colors" required>
      </div>

      <button type="submit" class="w-full mt-6 py-4 text-white font-medium bg-[#F0BD66] rounded-lg 
               hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
        Sign up
      </button>

      <p class="text-center text-sm text-gray-400 mt-6">
        Already have an account?
        <a href="/auth/sign-in" class="text-[#F0BD66] font-medium hover:text-amber-600 transition-colors">
          Sign in
        </a>
      </p>
    </form>
  </div>
</div>

```

### src/views/auth/verification.handlebars

```
<div class="w-full max-w-2xl px-5 ">
  <div class="bg-white rounded-xl shadow-md p-12 px-20">
    <h1 class="text-3xl font-semibold text-gray-900 text-center mb-3">OTP Verification</h1>
    <p class="text-gray-400 text-center mb-10">
      Enter the 6-digit verification code that was sent to your email.
    </p><p class="text-gray-400 text-center mb-10">
      In the unlikely case no email was sent, enter: 123456
    </p>

    <form id="otpForm" onsubmit="handleVerification(event)">
      <div class="flex justify-center gap-3 mb-8">
        <input type="text" maxlength="1" class="otp-input w-16 h-16 text-center text-2xl font-semibold text-gray-900 bg-gray-50 
                 border-2 border-gray-200 rounded-lg focus:border-amber-500 focus:bg-white 
                 focus:outline-none transition-all" required>
        <input type="text" maxlength="1" class="otp-input w-16 h-16 text-center text-2xl font-semibold
               text-gray-900 bg-gray-50 border-2 border-gray-200 rounded-lg focus:border-amber-500 
               focus:bg-white focus:outline-none transition-all" required>
        <input type="text" maxlength="1" class="otp-input w-16 h-16 text-center text-2xl font-semibold
               text-gray-900 bg-gray-50 border-2 border-gray-200 rounded-lg focus:border-amber-500 
               focus:bg-white focus:outline-none transition-all" required>
        <input type="text" maxlength="1" class="otp-input w-16 h-16 text-center text-2xl font-semibold
               text-gray-900 bg-gray-50 border-2 border-gray-200 rounded-lg focus:border-amber-500 
               focus:bg-white focus:outline-none transition-all" required>
        <input type="text" maxlength="1" class="otp-input w-16 h-16 text-center text-2xl font-semibold
               text-gray-900 bg-gray-50 border-2 border-gray-200 rounded-lg focus:border-amber-500 
               focus:bg-white focus:outline-none transition-all" required>
        <input type="text" maxlength="1" class="otp-input w-16 h-16 text-center text-2xl font-semibold
               text-gray-900 bg-gray-50 border-2 border-gray-200 rounded-lg focus:border-amber-500 
               focus:bg-white focus:outline-none transition-all" required>
      </div>

      <button type="submit" class="w-full py-4 text-white font-medium bg-gradient-to-r from-amber-400 to-amber-500 
               rounded-lg hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
        Verify Account
      </button>

      <p class="text-center text-sm text-gray-400 mt-6">
        Didn't receive code? Please
        Contact professor
      </p>
    </form>
  </div>
</div>

```

### src/views/error.handlebars

```
<div
    class="w-full h-screen flex flex-col lg:flex-row items-center justify-center space-y-16 lg:space-y-0 space-x-8 2xl:space-x-0">
    <div class="w-full lg:w-1/2 flex flex-col items-center justify-center lg:px-2 xl:px-0 text-center">
        <p class="text-7xl md:text-8xl lg:text-9xl font-bold tracking-wider text-gray-300">404</p>
        <p class="text-4xl md:text-5xl lg:text-6xl font-bold tracking-wider text-gray-300 mt-2">Page Not Found</p>
        <p class="text-lg md:text-xl lg:text-2xl text-gray-500 my-12">Sorry, the page you are looking for could not be
            found.</p>
        <a href="/"
            class="flex items-center space-x-2 bg-primary hover:bg-black text-gray-100 px-4 py-2 rounded transition duration-150"
            title="Return Home">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd"
                    d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z"
                    clip-rule="evenodd"></path>
            </svg>
            <span>Return Home</span>
        </a>
    </div>
    <div class="w-1/2 lg:h-full flex lg:items-end justify-center p-4">
        <svg class="w-full text-blue-600" xmlns="http://www.w3.org/2000/svg" data-name="Layer 1"
            viewBox="0 0 1120.59226 777.91584" xmlns:xlink="http://www.w3.org/1999/xlink">
            <title>not found</title>
            <circle cx="212.59226" cy="103" r="64" fill="#ff6584"></circle>
            <path
                d="M563.68016,404.16381c0,151.01141-89.77389,203.73895-200.51559,203.73895S162.649,555.17522,162.649,404.16381,363.16457,61.04208,363.16457,61.04208,563.68016,253.1524,563.68016,404.16381Z"
                transform="translate(-39.70387 -61.04208)" fill="#cbd5e1"></path>
            <polygon
                points="316.156 523.761 318.21 397.378 403.674 241.024 318.532 377.552 319.455 320.725 378.357 207.605 319.699 305.687 319.699 305.687 321.359 203.481 384.433 113.423 321.621 187.409 322.658 0 316.138 248.096 316.674 237.861 252.547 139.704 315.646 257.508 309.671 371.654 309.493 368.625 235.565 265.329 309.269 379.328 308.522 393.603 308.388 393.818 308.449 394.99 293.29 684.589 313.544 684.589 315.974 535.005 389.496 421.285 316.156 523.761"
                fill="#3f3d56"></polygon>
            <path
                d="M1160.29613,466.01367c0,123.61-73.4842,166.77-164.13156,166.77s-164.13156-43.16-164.13156-166.77S996.16457,185.15218,996.16457,185.15218,1160.29613,342.40364,1160.29613,466.01367Z"
                transform="translate(-39.70387 -61.04208)" fill="#cbd5e1"></path>
            <polygon
                points="950.482 552.833 952.162 449.383 1022.119 321.4 952.426 433.154 953.182 386.639 1001.396 294.044 953.382 374.329 953.382 374.329 954.741 290.669 1006.369 216.952 954.954 277.514 955.804 124.11 950.467 327.188 950.906 318.811 898.414 238.464 950.064 334.893 945.173 428.327 945.027 425.847 884.514 341.294 944.844 434.608 944.232 446.293 944.123 446.469 944.173 447.428 931.764 684.478 948.343 684.478 950.332 562.037 1010.514 468.952 950.482 552.833"
                fill="#3f3d56"></polygon>
            <ellipse cx="554.59226" cy="680.47903" rx="554.59226" ry="28.03433" fill="#3f3d56"></ellipse>
            <ellipse cx="892.44491" cy="726.79663" rx="94.98858" ry="4.80162" fill="#3f3d56"></ellipse>
            <ellipse cx="548.71959" cy="773.11422" rx="94.98858" ry="4.80162" fill="#3f3d56"></ellipse>
            <ellipse cx="287.94432" cy="734.27887" rx="217.01436" ry="10.96996" fill="#3f3d56"></ellipse>
            <circle cx="97.08375" cy="566.26982" r="79" fill="#2f2e41"></circle>
            <rect x="99.80546" y="689.02332" width="24" height="43"
                transform="translate(-31.32451 -62.31008) rotate(0.67509)" fill="#2f2e41"></rect>
            <rect x="147.80213" y="689.58887" width="24" height="43"
                transform="translate(-31.31452 -62.87555) rotate(0.67509)" fill="#2f2e41"></rect>
            <ellipse cx="119.54569" cy="732.61606" rx="7.5" ry="20"
                transform="translate(-654.1319 782.47948) rotate(-89.32491)" fill="#2f2e41"></ellipse>
            <ellipse cx="167.55414" cy="732.18168" rx="7.5" ry="20"
                transform="translate(-606.25475 830.05533) rotate(-89.32491)" fill="#2f2e41"></ellipse>
            <circle cx="99.31925" cy="546.29477" r="27" fill="#fff"></circle>
            <circle cx="99.31925" cy="546.29477" r="9" fill="#3f3d56"></circle>
            <path
                d="M61.02588,552.94636c-6.04185-28.64075,14.68758-57.26483,46.30049-63.93367s62.13813,11.14292,68.18,39.78367-14.97834,38.93-46.59124,45.59886S67.06774,581.58712,61.02588,552.94636Z"
                transform="translate(-39.70387 -61.04208)" fill="#F0BD66"></path>
            <path
                d="M257.29613,671.38411c0,55.07585-32.73985,74.3063-73.13,74.3063q-1.40351,0-2.80255-.0312c-1.87139-.04011-3.72494-.1292-5.55619-.254-36.45135-2.57979-64.77127-22.79937-64.77127-74.02113,0-53.00843,67.73872-119.89612,72.827-124.84633l.00892-.00889c.19608-.19159.29409-.28516.29409-.28516S257.29613,616.30827,257.29613,671.38411Z"
                transform="translate(-39.70387 -61.04208)" fill="#F0BD66"></path>
            <path
                d="M181.50168,737.26482l26.747-37.37367-26.81386,41.4773-.07125,4.29076c-1.87139-.04011-3.72494-.1292-5.55619-.254l2.88282-55.10258-.0223-.42775.049-.0802.27179-5.20415-26.88076-41.5798,26.96539,37.67668.06244,1.105,2.17874-41.63324-23.0132-42.96551,23.29391,35.6583,2.26789-86.31419.00892-.294v.28516l-.37871,68.064,22.91079-26.98321-23.00435,32.84678-.60595,37.27566L204.18523,621.958l-21.4805,41.259-.33863,20.723,31.05561-49.79149-31.17146,57.023Z"
                transform="translate(-39.70387 -61.04208)" fill="#3f3d56"></path>
            <circle cx="712.48505" cy="565.41532" r="79" fill="#2f2e41"></circle>
            <rect x="741.77716" y="691.82355" width="24" height="43"
                transform="translate(-215.99457 191.86399) rotate(-17.08345)" fill="#2f2e41"></rect>
            <rect x="787.6593" y="677.72286" width="24" height="43"
                transform="matrix(0.95588, -0.29376, 0.29376, 0.95588, -209.82788, 204.72037)" fill="#2f2e41"></rect>
            <ellipse cx="767.887" cy="732.00275" rx="20" ry="7.5"
                transform="translate(-220.8593 196.83312) rotate(-17.08345)" fill="#2f2e41"></ellipse>
            <ellipse cx="813.47537" cy="716.94619" rx="20" ry="7.5"
                transform="translate(-214.42477 209.56103) rotate(-17.08345)" fill="#2f2e41"></ellipse>
            <circle cx="708.52153" cy="545.71023" r="27" fill="#fff"></circle>
            <circle cx="708.52153" cy="545.71023" r="9" fill="#3f3d56"></circle>
            <path
                d="M657.35526,578.74316c-14.48957-25.43323-3.47841-59.016,24.59412-75.0092s62.57592-8.34055,77.06549,17.09268-2.39072,41.6435-30.46325,57.63671S671.84483,604.17639,657.35526,578.74316Z"
                transform="translate(-39.70387 -61.04208)" fill="#F0BD66"></path>
            <path
                d="M611.29613,661.29875c0,50.55711-30.05368,68.20979-67.13,68.20979q-1.28835,0-2.57261-.02864c-1.71785-.03682-3.41933-.1186-5.10033-.23313-33.46068-2.36813-59.45707-20.92878-59.45707-67.948,0-48.65932,62.18106-110.05916,66.85186-114.60322l.00819-.00817c.18-.17587.27-.26177.27-.26177S611.29613,610.74164,611.29613,661.29875Z"
                transform="translate(-39.70387 -61.04208)" fill="#F0BD66"></path>
            <path
                d="M541.72029,721.77424l24.55253-34.30732-24.6139,38.07426-.0654,3.93872c-1.71785-.03682-3.41933-.1186-5.10033-.23313l2.6463-50.58165-.02047-.39266.045-.07361.24949-4.77718-24.67531-38.16836,24.753,34.58547.05731,1.01433,2-38.21741-21.12507-39.44039L541.80616,625.928l2.08182-79.23247.00819-.26994v.26177l-.34764,62.47962,21.031-24.76934-21.11693,30.15184-.55624,34.21735,19.63634-32.839-19.71812,37.87389-.31085,19.0228,28.50763-45.70631-28.614,52.34448Z"
                transform="translate(-39.70387 -61.04208)" fill="#3f3d56"></path>
            <path
                d="M875.29613,682.38411c0,55.07585-32.73985,74.3063-73.13,74.3063q-1.4035,0-2.80255-.0312c-1.87139-.04011-3.72494-.1292-5.55619-.254-36.45135-2.57979-64.77127-22.79937-64.77127-74.02113,0-53.00843,67.73872-119.89612,72.827-124.84633l.00892-.00889c.19608-.19159.29409-.28516.29409-.28516S875.29613,627.30827,875.29613,682.38411Z"
                transform="translate(-39.70387 -61.04208)" fill="#F0BD66"></path>
            <path
                d="M799.50168,748.26482l26.747-37.37367-26.81386,41.4773-.07125,4.29076c-1.87139-.04011-3.72494-.1292-5.55619-.254l2.88282-55.10258-.0223-.42775.049-.0802.27179-5.20415L770.108,654.01076l26.96539,37.67668.06244,1.105,2.17874-41.63324-23.0132-42.96551,23.29391,35.6583,2.26789-86.31419.00892-.294v.28516l-.37871,68.064,22.91079-26.98321-23.00435,32.84678-.606,37.27566L822.18523,632.958l-21.4805,41.259-.33863,20.723,31.05561-49.79149-31.17146,57.023Z"
                transform="translate(-39.70387 -61.04208)" fill="#3f3d56"></path>
            <ellipse cx="721.51694" cy="656.82212" rx="12.40027" ry="39.5"
                transform="translate(-220.83517 966.22323) rotate(-64.62574)" fill="#2f2e41"></ellipse>
            <ellipse cx="112.51694" cy="651.82212" rx="12.40027" ry="39.5"
                transform="translate(-574.07936 452.71367) rotate(-68.15829)" fill="#2f2e41"></ellipse>
        </svg>
    </div>
</div>

```

### src/views/layouts/auth.handlebars

```
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{title}}</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>

<body class="min-h-screen bg-[#F9FAFE]  flex items-center justify-center">


    <main>
        {{{body}}}
    </main>

    <div id="auth-toast" class="fixed top-5 right-5 z-50 space-y-3"></div>
    <script src="/public/js/auth.js"></script>
    <script src="/public/js/utils.js"></script>
</body>

</html>

```

### src/views/layouts/main.handlebars

```
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{title}}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/ag-grid-community/dist/ag-grid-community.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/quill/1.3.7/quill.min.js"></script>

    <link rel="stylesheet" href="/public/css/style.css" />
    <script src="/public/js/tailwind.config.js"></script>


    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ag-grid-community/styles/ag-theme-alpine.css" />
    <link rel="stylesheet" href="/public/css/ag-grid.css" />
    <link href="https://cdnjs.cloudflare.com/ajax/libs/quill/1.3.7/quill.snow.css" rel="stylesheet">
    <link rel="stylesheet" href="/public/css/quill.css" />

</head>

<body class="min-h-screen bg-tertiary flex items-center justify-center">
    <div class="flex w-full h-screen  rounded-3xl shadow-sm">
        {{!-- {{> sidebar }} --}}
        <div id="mainContainer" data-user='{{{ json user }}}'
            class=" flex-1 flex flex-col   m-4 rounded-2xl  overflow-hidden">
            {{{body}}}
        </div>
    </div>

    <div id="auth-toast" class="fixed top-5 right-5 z-50 space-y-3"></div>


    {{!-- <div onclick="handleThemeToggle()"
        class="absolute group z-50 hover:cursor-pointer flex gap-1 bg-black p-1 rounded-2xl px-2 text-white right-1 top-32">
        <div class="hidden group-hover:block">
            Theme
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6">
            <path
                d="M18.75 12.75h1.5a.75.75 0 0 0 0-1.5h-1.5a.75.75 0 0 0 0 1.5ZM12 6a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 12 6ZM12 18a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 12 18ZM3.75 6.75h1.5a.75.75 0 1 0 0-1.5h-1.5a.75.75 0 0 0 0 1.5ZM5.25 18.75h-1.5a.75.75 0 0 1 0-1.5h1.5a.75.75 0 0 1 0 1.5ZM3 12a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 3 12ZM9 3.75a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0-4.5ZM12.75 12a2.25 2.25 0 1 1 4.5 0 2.25 2.25 0 0 1-4.5 0ZM9 15.75a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0-4.5Z" />
        </svg>

    </div>
    <div id="themeDropdown"
        class="absolute right-1 top-44 hidden  w-48 rounded-lg bg-white shadow-lg border text-sm p-3 space-y-3">
        <div>
            <label class="block text-xs font-medium mb-1">Primary</label>
            <input type="color" id="primaryColor" value="#F0BD66" class="w-full h-8 cursor-pointer" />
        </div>

        <div>
            <label class="block text-xs font-medium mb-1">Secondary</label>
            <input type="color" id="secondaryColor" value="#FFF7E8" class="w-full h-8 cursor-pointer" />
        </div>

        <div>
            <label class="block text-xs font-medium mb-1">Tertiary</label>
            <input type="color" id="tertiaryColor" value="#000000" class="w-full h-8 cursor-pointer" />
        </div>

        <button class="w-full mt-2 bg-black text-white py-1.5 rounded-md hover:opacity-90" onclick="applyCustomTheme()">
            Apply
        </button>
    </div> --}}


    <script src="/public/js/theme.js"></script>
    <script src="/public/js/utils.js"></script>
</body>

</html>

```

### src/views/main/category-detail.handlebars

```
<!-- Header -->
<div
    class="sticky flex justify-between top-0 inset-x-0 z-20 mt-6 mx-6 bg-white border-y border-gray-400 px-4 sm:px-6 lg:px-8">
    <div class="flex items-center py-2 gap-4">
        <!-- Toggle + Logo Container -->
        <div id="toggleLogoContainer" class="flex items-center gap-4">
            <!-- Sidebar Toggle Button -->
            <button type="button" id="sidebarToggle"
                class="size-8 flex justify-center items-center gap-x-2 border border-gray-400 rounded-xl text-gray-800 hover:text-gray-500 focus:outline-hidden focus:text-gray-500"
                aria-label="Toggle sidebar" onclick="toggleSidebar()">
                <span class="sr-only">Toggle Sidebar</span>
                <svg class="shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                    stroke-linejoin="round">
                    <rect width="18" height="18" x="3" y="3" rx="2" />
                    <path d="M15 3v18" />
                    <path d="m8 9 3 3-3 3" />
                </svg>
            </button>

            <!-- Logo/Brand -->
            <a href="/" class="flex items-center gap-2">
                <svg class="size-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                    stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round"
                        d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42" />
                </svg>
                <span class="font-bold text-lg text-gray-800 hidden sm:block">UI Components</span>
            </a>
        </div>

        <!-- Breadcrumb -->
        <ol class="ms-3 hidden md:flex items-center whitespace-nowrap">
            <li class="flex items-center text-sm text-gray-800">
                <a href="/" class="hover:text-primary">Home</a>
                <svg class="shrink-0 mx-3 overflow-visible size-2.5 text-gray-400" width="16" height="16"
                    viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 1L10.6869 7.16086C10.8637 7.35239 10.8637 7.64761 10.6869 7.83914L5 14"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                </svg>
            </li>
            <li class="text-sm font-semibold text-gray-800 truncate" aria-current="page">
                {{categoryName}}
            </li>
        </ol>
    </div>

    <div class="flex items-center py-2 gap-3">
        <!-- Category Filter Dropdown -->
        <div class="relative hidden sm:block">
            <select id="categoryFilter" onchange="handleCategoryFilter(event)"
                class="h-8 px-3 text-sm border border-gray-400 rounded-xl text-gray-800 focus:outline-none focus:border-primary appearance-none pr-8 bg-white">
                {{#each allCategories}}
                <option value="{{this.slug}}" {{#if this.isActive}}selected{{/if}}>{{this.name}} ({{this.count}})
                </option>
                {{/each}}
            </select>
            <svg class="absolute right-2 top-2 size-4 text-gray-400 pointer-events-none"
                xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
        </div>

        {{#if user}}
        <!-- Add Component Button -->
        <button command="show-modal" commandfor="dialog"
            class="h-8 px-3 text-sm hover:text-white hover:bg-primary hover:cursor-pointer hover:shadow-xl flex justify-center items-center gap-x-2 border border-gray-400 rounded-xl text-gray-800 rounded-lg focus:outline-hidden disabled:opacity-50 disabled:pointer-events-none transition-all"
            title="Create new component">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4">
                <path
                    d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
            </svg>
            <span class="hidden sm:inline">Add Component</span>
        </button>

        <!-- User Menu Dropdown -->
        <div class="relative">
            <button onclick="toggleUserMenu()"
                class="h-8 w-8 flex items-center justify-center rounded-full bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-all">
                {{substring user.last_name 0 1}}
            </button>

            <!-- Dropdown Menu -->
            <div id="userMenu"
                class="hidden absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <div class="px-4 py-2 border-b border-gray-200">
                    <p class="text-sm font-semibold text-gray-800">{{user.last_name}}</p>
                    <p class="text-xs text-gray-500 truncate">{{user.email}}</p>
                </div>
                <a href="/my-components" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    <svg class="inline size-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                        stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 0 1-1.125-1.125v-3.75ZM14.25 8.625c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 0 1-1.125-1.125v-8.25ZM3.75 16.125c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 0 1-1.125-1.125v-2.25Z" />
                    </svg>
                    My Components
                </a>
                <a href="/auth/sign-out" class="block px-4 py-2 text-sm text-red-600 hover:bg-gray-100">
                    <svg class="inline size-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                        stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M13.5 10.5V6.75a4.5 4.5 0 1 1 9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                    </svg>
                    Sign Out
                </a>
            </div>
        </div>
        {{else}}
        <a href="/auth/sign-in"
            class="h-8 px-3 text-sm hover:text-white hover:bg-primary hover:cursor-pointer hover:shadow-xl flex justify-center items-center gap-x-2 border border-gray-400 rounded-xl text-gray-800 rounded-lg focus:outline-hidden transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                stroke="currentColor" class="size-4">
                <path stroke-linecap="round" stroke-linejoin="round"
                    d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
            Sign In
        </a>
        {{/if}}
    </div>
</div>

<!-- Sidebar + Main Content Layout -->
<div class="flex relative">

    <!-- Sidebar Navigation -->
    {{> sidebar
    sidebarId="category-sidebar"
    activePage="category"
    showCategoryInfo=true
    categoryName=categoryName
    componentCount=components.length
    }}

    <!-- Main Content Area -->
    <main class="flex-1 p-6 overflow-auto h-screen transition-all duration-300" id="mainContent">
        <!-- Category Header -->
        <div class="mb-8">
            <h1 class="text-4xl font-bold text-gray-900 mb-2">{{categoryName}}</h1>
            <p class="text-gray-600">{{components.length}} components in this category</p>
        </div>

        <!-- Components List -->
        <div class="space-y-12">
            {{#if components}}
            {{#each components}}
            {{> component-playground index=@index}}
            {{/each}}
            {{else}}
            <div class="text-center py-20">
                <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 class="mt-2 text-sm font-medium text-gray-900">No components</h3>
                <p class="mt-1 text-sm text-gray-500">Get started by creating a new component.</p>
                {{#if user}}
                <div class="mt-6">
                    <button command="show-modal" commandfor="dialog"
                        class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90">
                        <svg class="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"
                            fill="currentColor">
                            <path fill-rule="evenodd"
                                d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                                clip-rule="evenodd" />
                        </svg>
                        New Component
                    </button>
                </div>
                {{/if}}
            </div>
            {{/if}}
        </div>
    </main>

</div>

{{!-- Modals --}}
{{> component-editor-modal}}


<script>
    function handleCategoryFilter(event) {
        const category = event.target.value;
        window.location.href = `/category/${category}`;
    }

    function toggleUserMenu() {
        const menu = document.getElementById('userMenu');
        menu.classList.toggle('hidden');
    }

    // Sidebar toggle function
    function toggleSidebar() {
        const sidebar = document.getElementById('category-sidebar');
        const toggleButton = document.getElementById('sidebarToggle');
        const currentMargin = sidebar.style.marginLeft;

        if (currentMargin === '0px') {
            sidebar.style.marginLeft = '-256px';
            toggleButton.classList.remove('order-2');
            toggleButton.classList.add('order-first');
        } else {
            sidebar.style.marginLeft = '0';
            toggleButton.classList.remove('order-first');
            toggleButton.classList.add('order-2');
        }
    }

    // Close user menu when clicking outside
    document.addEventListener('click', (event) => {
        const userMenu = document.getElementById('userMenu');
        const userButton = event.target.closest('button[onclick="toggleUserMenu()"]');

        if (userMenu && !userMenu.contains(event.target) && !userButton) {
            userMenu.classList.add('hidden');
        }
    });
</script>

<!-- Load home.js for editor functionality -->
<script src="/public/js/home.js"></script>

<!-- Load category.js for component rendering -->
<script src="/public/js/category.js"></script>

```

### src/views/main/home.handlebars

```
<!-- Header -->
<div
    class="sticky flex justify-between top-0 inset-x-0 z-20 mt-6 mx-6 bg-white border-y border-gray-400 px-4 sm:px-6 lg:px-8">
    <div class="flex items-center py-2 gap-4">
        <!-- Toggle + Logo Container -->
        <div id="toggleLogoContainer" class="flex items-center gap-4">
            <!-- Sidebar Toggle Button -->
            <button type="button" id="sidebarToggle"
                class="size-8 flex justify-center items-center gap-x-2 border border-gray-400 rounded-xl text-gray-800 hover:text-gray-500 focus:outline-hidden focus:text-gray-500"
                aria-label="Toggle sidebar" onclick="toggleSidebar()">
                <span class="sr-only">Toggle Sidebar</span>
                <svg class="shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                    stroke-linejoin="round">
                    <rect width="18" height="18" x="3" y="3" rx="2" />
                    <path d="M15 3v18" />
                    <path d="m8 9 3 3-3 3" />
                </svg>
            </button>

            <!-- Logo/Brand -->
            <a href="/" class="flex items-center gap-2">

                <span class="font-bold text-lg text-gray-800 hidden sm:block">WINDCRAFT</span>
            </a>
        </div>

        <!-- Search Bar -->
        <div class="relative hidden md:block">
            <input type="text" id="searchInput" placeholder="Search components..."
                class="w-64 px-4 py-1.5 text-sm border border-gray-400 rounded-lg focus:outline-none focus:border-primary"
                onkeyup="handleSearch(event)">
            <svg class="absolute right-3 top-2 size-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none"
                viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round"
                    d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
        </div>

        <!-- Stats Badge -->
        {{#if totalComponents}}
        <span class="hidden lg:flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-lg text-sm text-gray-600">
            <svg class="size-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round"
                    d="M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 0 1-1.125-1.125v-3.75ZM14.25 8.625c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 0 1-1.125-1.125v-8.25ZM3.75 16.125c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 0 1-1.125-1.125v-2.25Z" />
            </svg>
            {{totalComponents}} Components
        </span>
        {{/if}}
    </div>

    <div class="flex items-center py-2 gap-3">
        <!-- Category Filter Dropdown -->
        <div class="relative hidden sm:block">
            <select id="categoryFilter" onchange="handleCategoryFilter(event)"
                class="h-8 px-3 text-sm border border-gray-400 rounded-xl text-gray-800 focus:outline-none focus:border-primary appearance-none pr-8 bg-white">
                <option value="all">All Categories</option>
                {{#each categories}}
                <option value="{{this.slug}}">{{this.name}} ({{this.count}})</option>
                {{/each}}
            </select>
            <svg class="absolute right-2 top-2 size-4 text-gray-400 pointer-events-none"
                xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
        </div>

        {{#if user}}
        <!-- Add Component Button -->
        <button command="show-modal" commandfor="dialog"
            class="h-8 px-3 text-sm hover:text-white hover:bg-primary hover:cursor-pointer hover:shadow-xl flex justify-center items-center gap-x-2 border border-gray-400 rounded-xl text-gray-800 rounded-lg focus:outline-hidden disabled:opacity-50 disabled:pointer-events-none transition-all"
            title="Create new component">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4">
                <path
                    d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
            </svg>
            <span class="hidden sm:inline">Add Component</span>
        </button>

        <!-- User Menu Dropdown -->
        <div class="relative">
            <button onclick="toggleUserMenu()"
                class="h-8 w-8 flex items-center justify-center rounded-full bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-all">
                {{substring user.last_name 0 1}}
            </button>

            <!-- Dropdown Menu -->
            <div id="userMenu"
                class="hidden absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <div class="px-4 py-2 border-b border-gray-200">
                    <p class="text-sm font-semibold text-gray-800">{{user.last_name}}</p>
                    <p class="text-xs text-gray-500 truncate">{{user.email}}</p>
                </div>
                <a href="/my-components" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    <svg class="inline size-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                        stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 0 1-1.125-1.125v-3.75ZM14.25 8.625c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 0 1-1.125-1.125v-8.25ZM3.75 16.125c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 0 1-1.125-1.125v-2.25Z" />
                    </svg>
                    My Components
                </a>
                <a href="/auth/sign-out" class="block px-4 py-2 text-sm text-red-600 hover:bg-gray-100">
                    <svg class="inline size-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                        stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M13.5 10.5V6.75a4.5 4.5 0 1 1 9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                    </svg>
                    Sign Out
                </a>
            </div>
        </div>
        {{else}}
        <a href="/auth/sign-in"
            class="h-8 px-3 text-sm hover:text-white hover:bg-primary hover:cursor-pointer hover:shadow-xl flex justify-center items-center gap-x-2 border border-gray-400 rounded-xl text-gray-800 rounded-lg focus:outline-hidden transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                stroke="currentColor" class="size-4">
                <path stroke-linecap="round" stroke-linejoin="round"
                    d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
            Sign In
        </a>
        {{/if}}
    </div>
</div>

<!-- Sidebar + Main Content Layout -->
<div class="flex relative">

    <!-- Sidebar Navigation -->
    {{> sidebar
    sidebarId="home-sidebar"
    activePage="home"
    showCategoryInfo=false
    }}

    <!-- Main Content Area -->
    <main class="flex-1">
        <!-- Content -->
        <div class="">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-6">

                {{#each categories}}
                <a href="/category/{{this.slug}}" class="component-card group block">
                    <div
                        class="bg-gray-50 h-[225px] overflow-hidden border border-gray-400 rounded-xl group-hover:border-2 group-hover:border-gray-400 group-hover:shadow-xl">
                        <div
                            class="card-image h-[70%] bg-gray-100 px-10 pt-5 shadow-2xl shadow-white border border-gray-100">
                            <div class="space-y-3 bg-white p-3 rounded-t-xl">
                                <div class="flex items-center space-x-1 mb-4">
                                    <div class="w-2 h-2 rounded-full bg-gray-300"></div>
                                    <div class="w-2 h-2 rounded-full bg-gray-300"></div>
                                    <div class="w-2 h-2 rounded-full bg-gray-300"></div>
                                </div>
                                <div class="space-y-2">
                                    <div class="text-xs text-gray-500">Start your journey</div>
                                    <div class="text-xs text-gray-500">with <span
                                            class="text-primary font-semibold">Preline</span></div>
                                    <div class="inline-block bg-primary rounded px-2 py-1 text-white text-xs mt-2">
                                        Button</div>
                                    <div class="flex items-center space-x-1 mt-2">
                                        <div class="w-1 h-1 rounded-full bg-gray-800"></div>
                                        <div class="w-1 h-1 rounded-full bg-gray-800"></div>
                                        <div class="w-1 h-1 rounded-full bg-gray-800"></div>
                                        <div class="w-1 h-1 rounded-full bg-gray-800"></div>
                                        <div class="w-1 h-1 rounded-full bg-gray-800"></div>
                                    </div>
                                    <div class="flex space-x-2 mt-2">
                                        <div class="h-1 bg-gray-200 rounded flex-1"></div>
                                        <div class="h-1 bg-gray-200 rounded flex-1"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="flex items-center h-[30%] justify-between bg-white p-4">
                            <div>
                                <div class="flex items-center gap-2 mb-1">
                                    <h4 class="font-semibold text-primary text-sm group-hover:text-primary transition">
                                        {{this.name}}
                                    </h4>
                                    {{#if this.hasNew}}
                                    <span
                                        class="bg-secondary text-primary text-xs px-2 py-0.5 rounded-full font-medium">+{{this.newCount}}
                                        NEW</span>
                                    {{/if}}
                                </div>
                                <p class="text-sm text-gray-500">{{this.count}} components</p>
                            </div>
                        </div>
                    </div>
                </a>
                {{/each}}

            </div>
        </div>
    </main>
</div>


{{!-- Modals --}}
{{> component-editor-modal}}


<script>
    // Search functionality
    function handleSearch(event) {
        const searchTerm = event.target.value.toLowerCase();
        const cards = document.querySelectorAll('.component-card');

        cards.forEach(card => {
            const title = card.querySelector('h4').textContent.toLowerCase();
            const category = card.querySelector('p').textContent.toLowerCase();

            if (title.includes(searchTerm) || category.includes(searchTerm)) {
                card.classList.remove('hidden');
            } else {
                card.classList.add('hidden');
            }
        });
    }

    // Category filter
    function handleCategoryFilter(event) {
        const category = event.target.value;

        if (category === 'all') {
            window.location.href = '/';
        } else {
            window.location.href = `/category/${category}`;
        }
    }

    // User menu toggle
    function toggleUserMenu() {
        const menu = document.getElementById('userMenu');
        menu.classList.toggle('hidden');
    }

    // Sidebar toggle function
    function toggleSidebar() {
        const sidebar = document.getElementById('home-sidebar');
        const toggleButton = document.getElementById('sidebarToggle');
        const logo = document.querySelector('a[href="/"]');
        const container = document.getElementById('toggleLogoContainer');
        const currentMargin = sidebar.style.marginLeft;

        if (currentMargin === '0px') {
            // Close sidebar - button goes to left of logo
            sidebar.style.marginLeft = '-256px';
            container.insertBefore(toggleButton, logo);
        } else {
            // Open sidebar - button goes to right of logo
            sidebar.style.marginLeft = '0';
            container.insertBefore(toggleButton, logo.nextSibling);
        }
    }

    // Close menu when clicking outside
    document.addEventListener('click', (event) => {
        const userMenu = document.getElementById('userMenu');
        const userButton = event.target.closest('button[onclick="toggleUserMenu()"]');

        if (userMenu && !userMenu.contains(event.target) && !userButton) {
            userMenu.classList.add('hidden');
        }
    });
</script>

<script src="/public/js/home.js"></script>

```

### src/views/partials/component-editor-modal.handlebars

```
{{!-- Component Editor Modal --}}
<el-dialog>
    <dialog id="dialog" aria-labelledby="dialog-title"
        class="fixed inset-0 size-auto max-h-none max-w-none overflow-y-auto bg-transparent backdrop:bg-transparent">
        <el-dialog-backdrop
            class="fixed inset-0 bg-gray-500/75 transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"></el-dialog-backdrop>

        <div tabindex="0"
            class="flex min-h-full items-end justify-center p-4 text-center focus:outline-none sm:items-center sm:p-0">
            <el-dialog-panel
                class="relative transform w-[80%] overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:my-8 data-closed:sm:translate-y-0 data-closed:sm:scale-95">
                <div class="h-[600px] flex flex-col">

                    <!-- Editor and Preview -->
                    <form id="componentForm" class="flex-1 flex min-h-0" method="POST" action="javascript:void(0);"
                        onsubmit="handleSave(event)">
                        <!-- Editor Panel -->
                        <div class="flex-1 flex w-1/3 flex-col bg-primary border-r border-gray-800">
                            <div
                                class="flex items-center justify-between px-6 py-3 bg-primary/50 border-b border-gray-800">
                                <div class="flex items-center gap-2">
                                    <span class="text-sm font-medium text-gray-400">index.html</span>
                                    <div class="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                </div>
                                <span class="text-xs text-gray-600 font-mono">HTML</span>
                            </div>
                            <textarea id="htmlEditor" name="htmlEditor" required
                                class="flex-1 w-full p-6 bg-primary text-green-500 focus:outline-none resize-none code-editor text-sm editor-scrollbar"
                                placeholder="<!DOCTYPE html>
<html>
  <head>
    <title>Document</title>
  </head>
  <body>
    
  </body>
</html>" spellcheck="false" oninput="handleChangeEditor(event)"></textarea>

                            <!-- AI Chatbox _____________________________________________________________  -->
                            <div class="border-t border-neutral-900 bg-black p-5 flex flex-col ">

                                {{!-- <!-- Header -->
                                <div class="flex items-center justify-between mb-4">
                                    <div class="flex items-center gap-2">
                                        <div class="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                                        <span class="text-sm font-medium text-neutral-300 tracking-wide">
                                            AI Assistant
                                        </span>
                                    </div>
                                    <span class="text-xs text-neutral-600 font-mono">
                                        HTML Mode
                                    </span>
                                </div>

                                <!-- Messages Area -->
                                <div class="flex-1 overflow-y-auto space-y-4 pr-1">

                                    <!-- AI Message -->
                                    <div
                                        class="bg-neutral-900 border border-neutral-800 text-neutral-300 text-sm px-4 py-3 rounded-2xl max-w-[85%]">
                                        Ask me to generate or improve your HTML.
                                    </div>

                                    <!-- Example User Message -->
                                    <!--
        <div class="ml-auto bg-white text-black text-sm px-4 py-3 rounded-2xl max-w-[85%]">
            Create a responsive navbar
        </div>
        -->

                                </div> --}}

                                <!-- Input Area -->
                                <div class=" flex items-center gap-3 relative">

                                    <input type="text" placeholder="Type your prompt..." class="flex-1 bg-neutral-950 border border-neutral-800 text-sm text-white px-4 py-3 rounded-2xl 
                   focus:outline-none focus:ring-0 focus:ring-white focus:border-white
                   placeholder-neutral-600 transition-all duration-200" />

                                    <button class="absolute right-2  ">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
                                            class="size-9 text-white text-opacity-50 z-5">
                                            <path fill-rule="evenodd"
                                                d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm.53 5.47a.75.75 0 0 0-1.06 0l-3 3a.75.75 0 1 0 1.06 1.06l1.72-1.72v5.69a.75.75 0 0 0 1.5 0v-5.69l1.72 1.72a.75.75 0 1 0 1.06-1.06l-3-3Z"
                                                clip-rule="evenodd" />
                                        </svg>

                                    </button>

                                </div>

                            </div>
                            <!-- AI Chatbox _____________________________________________________________  -->

                        </div>

                        <!-- Preview Panel -->
                        <div class="flex-1 w-1/3 flex flex-col bg-gray-950 relative">
                            <div
                                class="flex items-center justify-between px-6 py-2.5 bg-primary/50 border border-gray-800">
                                <div class="flex items-center gap-2">
                                    <span class="text-sm font-medium text-gray-400">Preview</span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <div id="movementButton" onclick="handleMovement()"
                                        class="hover:bg-white bg-slate-200 hover:text-black hover:cursor-pointer text-primary p-1 rounded-md">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                                            stroke-width="1.5" stroke="currentColor" class="size-4">
                                            <path stroke-linecap="round" stroke-linejoin="round"
                                                d="M10.05 4.575a1.575 1.575 0 1 0-3.15 0v3m3.15-3v-1.5a1.575 1.575 0 0 1 3.15 0v1.5m-3.15 0 .075 5.925m3.075.75V4.575m0 0a1.575 1.575 0 0 1 3.15 0V15M6.9 7.575a1.575 1.575 0 1 0-3.15 0v8.175a6.75 6.75 0 0 0 6.75 6.75h2.018a5.25 5.25 0 0 0 3.712-1.538l1.732-1.732a5.25 5.25 0 0 0 1.538-3.712l.003-2.024a.668.668 0 0 1 .198-.471 1.575 1.575 0 1 0-2.228-2.228 3.818 3.818 0 0 0-1.12 2.687M6.9 7.575V12m6.27 4.318A4.49 4.49 0 0 1 16.35 15m.002 0h-.002" />
                                        </svg>
                                    </div>

                                    <div onclick="clearEditor()"
                                        class="hover:bg-white hover:text-black hover:cursor-pointer text-secondary p-1 rounded-md">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                                            stroke-width="1.5" stroke="currentColor" class="size-4">
                                            <path stroke-linecap="round" stroke-linejoin="round"
                                                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                                        </svg>
                                    </div>

                                    <div
                                        class="hover:bg-white hover:text-black hover:cursor-pointer text-secondary p-1 rounded-md">
                                        <label class="select-none hover:cursor-pointer">
                                            <input type="checkbox" onchange="handleDisplaySize(event)"
                                                class="peer sr-only">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                                                stroke-width="1.5" stroke="currentColor"
                                                class="size-4 block peer-checked:hidden">
                                                <path stroke-linecap="round" stroke-linejoin="round"
                                                    d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                                            </svg>
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                                                stroke-width="1.5" stroke="currentColor"
                                                class="size-4 hidden peer-checked:block">
                                                <path stroke-linecap="round" stroke-linejoin="round"
                                                    d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" />
                                            </svg>
                                        </label>
                                    </div>

                                    <div onclick="togglePreviewFullscreen()"
                                        class="hover:bg-white hover:text-black hover:cursor-pointer text-secondary p-1 rounded-md">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                                            stroke-width="1.5" stroke="currentColor" class="size-4">
                                            <path stroke-linecap="round" stroke-linejoin="round"
                                                d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            <style id="previewPointerStyle">
                                #preview:hover * {
                                    pointer-events: none;
                                }
                            </style>
                            <style>
                                .grid-bg {
                                    background-color: white;
                                    background-image:
                                        linear-gradient(#ddd 0.5px, transparent 0.5px),
                                        linear-gradient(90deg, #ddd 0.5px, transparent 0.5px),
                                        linear-gradient(#aaa 1px, transparent 1px),
                                        linear-gradient(90deg, #aaa 1px, transparent 1px);
                                    background-size:
                                        20px 20px,
                                        20px 20px,
                                        100px 100px,
                                        100px 100px;
                                }
                            </style>

                            <div id="preview-wrapper"
                                class="grid-bg preview-wrapper bg-white w-full overflow-auto h-full">
                                <div id="fullScreenTools"
                                    class="flex items-center sticky hidden gap-2 bg-black w-fit p-2 rounded-xl m-4 z-50">
                                    <div id="movementButton2" onclick="handleMovement()"
                                        class="hover:bg-white bg-slate-200 hover:text-black hover:cursor-pointer text-primary p-1 rounded-md">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                                            stroke-width="1.5" stroke="currentColor" class="size-6">
                                            <path stroke-linecap="round" stroke-linejoin="round"
                                                d="M10.05 4.575a1.575 1.575 0 1 0-3.15 0v3m3.15-3v-1.5a1.575 1.575 0 0 1 3.15 0v1.5m-3.15 0 .075 5.925m3.075.75V4.575m0 0a1.575 1.575 0 0 1 3.15 0V15M6.9 7.575a1.575 1.575 0 1 0-3.15 0v8.175a6.75 6.75 0 0 0 6.75 6.75h2.018a5.25 5.25 0 0 0 3.712-1.538l1.732-1.732a5.25 5.25 0 0 0 1.538-3.712l.003-2.024a.668.668 0 0 1 .198-.471 1.575 1.575 0 1 0-2.228-2.228 3.818 3.818 0 0 0-1.12 2.687M6.9 7.575V12m6.27 4.318A4.49 4.49 0 0 1 16.35 15m.002 0h-.002" />
                                        </svg>
                                    </div>
                                    <div
                                        class="hover:bg-white hover:text-black hover:cursor-pointer text-secondary p-1 rounded-md">
                                        <label class="select-none hover:cursor-pointer">
                                            <input type="checkbox" onchange="handleDisplaySize(event)"
                                                class="peer sr-only">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                                                stroke-width="1.5" stroke="currentColor"
                                                class="size-6 block peer-checked:hidden">
                                                <path stroke-linecap="round" stroke-linejoin="round"
                                                    d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                                            </svg>
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                                                stroke-width="1.5" stroke="currentColor"
                                                class="size-6 hidden peer-checked:block">
                                                <path stroke-linecap="round" stroke-linejoin="round"
                                                    d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" />
                                            </svg>
                                        </label>
                                    </div>
                                    <div onclick="togglePreviewFullscreen()"
                                        class="hover:bg-white hover:text-black hover:cursor-pointer text-secondary p-1 rounded-md">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                                            stroke-width="1.5" stroke="currentColor" class="size-6">
                                            <path stroke-linecap="round" stroke-linejoin="round"
                                                d="M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5 5.25 5.25" />
                                        </svg>
                                    </div>
                                </div>
                                <div id="preview"
                                    class="flex-1 w-fit p-1 hover:border-2 border-2 relative border-dashed hover:border-black bg-white">
                                </div>
                            </div>
                        </div>

                        <!-- Details Panel -->
                        <div id="detailsPanel"
                            class="flex-1 w-1/3 flex hidden flex-col border-l border-gray-800 gap-4 bg-white relative">
                            <div
                                class="flex items-center justify-between px-6 py-3 border-y border-gray-800 bg-primary/50 bg-primary">
                                <div class="flex items-center gap-2">
                                    <span class="text-sm font-medium text-gray-400">Details</span>
                                </div>
                            </div>

                            <div class="flex flex-col px-4">
                                <div>
                                    <label for="title" class="text-primary p-1">Title</label>
                                    <input type="text" id="title" name="title" placeholder="Header"
                                        class="w-full px-4 mt-2 py-3.5 text-gray-900 placeholder-gray-300 bg-white border border-gray-400 rounded-xl focus:border-primary focus:outline-none transition-colors"
                                        required>
                                </div>
                            </div>

                            <div class="flex flex-col px-4">
                                <div>
                                    <label for="category" class="text-primary p-1">Category</label>
                                    <select id="category" name="category"
                                        class="w-full px-4 mt-2 py-3.5 text-gray-900 bg-white border border-gray-400 rounded-xl focus:border-primary focus:outline-none transition-colors"
                                        required>
                                        <option value="" disabled selected>Select a category</option>
                                        <option value="marketing-hero">Hero Sections</option>
                                        <option value="marketing-hero-forms">Hero Forms</option>
                                        <option value="marketing-icons">Icon Sections</option>
                                        <option value="marketing-pricing">Pricing Sections</option>
                                        <option value="marketing-faq">FAQ Sections</option>
                                        <option value="marketing-blog">Blog Sections</option>
                                        <option value="marketing-testimonials">Testimonials</option>
                                        <option value="marketing-team">Team Sections</option>
                                        <option value="marketing-features">Features</option>
                                        <option value="marketing-announcements">Announcement Banners</option>
                                        <option value="marketing-cards">Card Sections</option>
                                        <option value="marketing-clients">Clients Sections</option>
                                        <option value="marketing-galleries">Galleries</option>
                                        <option value="marketing-timeline">Timeline</option>
                                        <option value="ui-dropdowns">Dropdowns</option>
                                        <option value="ui-selects">Selects</option>
                                        <option value="ui-buttons">Button Groups</option>
                                        <option value="ui-modals">Modals</option>
                                        <option value="ui-cookie-banners">Cookie Banners</option>
                                        <option value="navigation-navbars">Navbars / Headers</option>
                                        <option value="navigation-mega-menu">Mega Menu</option>
                                        <option value="layout-basic">Layouts</option>
                                        <option value="forms-authentication">Authentication</option>
                                        <option value="forms-feedback">Feedback</option>
                                        <option value="forms-subscribe">Subscribe</option>
                                        <option value="forms-textarea">Textarea Inputs</option>
                                        <option value="pages-pricing">Pricing Page</option>
                                        <option value="ecommerce-products">Product Listings</option>
                                        <option value="apps-general">Application Components</option>
                                        <option value="apps-invoice">Invoice</option>
                                        <option value="apps-tables">Tables</option>
                                        <option value="apps-stats">Stats</option>
                                        <option value="apps-charts">Charts</option>
                                        <option value="apps-ai-prompt">AI Prompt</option>
                                        <option value="footer-contact">Contact Sections</option>
                                        <option value="footer-footers">Footers</option>
                                    </select>
                                </div>
                            </div>

                            <div class="flex flex-col px-4 h-full mb-32">
                                <div class="h-full">
                                    <label for="description" class="text-primary p-1">Description</label>
                                    <textarea id="description" name="description" placeholder="Describe your component"
                                        class="w-full h-full px-4 mt-2 py-3.5 text-gray-900 placeholder-gray-300 bg-white border border-gray-400 rounded-xl focus:border-primary focus:outline-none transition-colors"
                                        required></textarea>
                                </div>
                            </div>
                        </div>

                        <!-- Buttons -->
                        <div class="bg-white rounded-xl flex justify-end m-2 absolute right-0 bottom-0">
                            <div
                                class="border border-gray-400 w-fit p-1 gap-2 flex items-center justify-center rounded-xl">
                                <button id="cancelBtn" type="reset" onclick="handleClose()"
                                    class="p-1 hover:bg-primary hover:text-secondary rounded-md hover:cursor-pointer">
                                    Cancel
                                </button>
                                <button id="backBtn" type="button" onclick="handleBack()"
                                    class="hidden p-1 hover:bg-primary hover:text-secondary rounded-md hover:cursor-pointer">
                                    Back
                                </button>
                                <div>|</div>
                                <button id="nextBtn" type="button" onclick="handleNext()"
                                    class="p-1 hover:bg-primary hover:text-secondary rounded-md hover:cursor-pointer">
                                    Next
                                </button>
                                <button id="submitBtn" type="submit"
                                    class="p-1 hidden hover:bg-primary hover:text-secondary rounded-md hover:cursor-pointer">
                                    Submit
                                </button>
                            </div>
                        </div>
                    </form>

                </div>
            </el-dialog-panel>
        </div>
    </dialog>
</el-dialog>

```

### src/views/partials/component-playground.handlebars

```
<div class="w-full bg-gray-50 p-8 rounded-2xl border border-gray-200" data-component-id="{{_id}}"
    data-elements="{{json elementsDescription}}">

    <!-- Scoped styles for this playground -->
    <style>
        /* Contain all positioning within preview */
        #preview- {
                {
                _id
            }
        }

            {
            position: relative;
            isolation: isolate;
            overflow: hidden;
        }

        /* Neutralize sticky positioning */
        #preview-inner- {
                {
                _id
            }
        }

        .sticky,
        #preview-inner- {
                {
                _id
            }
        }

        [class*="sticky"] {
            position: relative !important;
        }

        /* Convert fixed to absolute within container */
        #preview-inner- {
                {
                _id
            }
        }

        .fixed,
        #preview-inner- {
                {
                _id
            }
        }

        [class*="fixed"] {
            position: absolute !important;
        }

        /* Container setup */
        #preview-inner- {
                {
                _id
            }
        }

            {
            position: relative;
            min-height: 200px;
        }

        /* Reset z-index hierarchy */
        #preview-inner- {
                {
                _id
            }
        }

        * {
            max-height: inherit;
        }
    </style>

    <!-- Header -->
    <div class="flex items-center justify-between mb-6">

        <!-- Left Title -->
        <div>
            <h2 class="text-xl font-semibold text-gray-900">
                {{title}}
            </h2>
            {{#if description}}
            <p class="text-sm text-gray-500 mt-1">
                {{description}}
            </p>
            {{/if}}
        </div>

        <!-- Right Controls -->
        <div class="flex items-center space-x-6">

            <!-- Preview / Code Toggle -->
            <div class="flex items-center bg-gray-200 rounded-full p-1">
                <button onclick="toggleTab('{{_id}}','preview')" id="preview-btn-{{_id}}"
                    class="px-4 py-1.5 text-sm font-medium rounded-full bg-white shadow text-gray-900">
                    Preview
                </button>
                <button onclick="toggleTab('{{_id}}','code')" id="code-btn-{{_id}}"
                    class="px-4 py-1.5 text-sm font-medium rounded-full text-gray-600">
                    Code
                </button>
            </div>

            <div class="h-6 w-px bg-gray-300"></div>

            <!-- Icons -->
            <div class="flex items-center space-x-3 text-gray-600">

                <!-- Mobile/Desktop Width Toggle -->
                <button onclick="toggleViewSize('{{_id}}')" class="p-2 rounded-md hover:bg-gray-200 view-toggle-{{_id}}"
                    title="Toggle mobile/desktop view">
                    <label class="select-none hover:cursor-pointer">
                        <input type="checkbox" id="view-toggle-{{_id}}" class="peer sr-only">
                        <!-- Mobile Icon (default) -->
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                            stroke="currentColor" class="w-5 h-5 block peer-checked:hidden">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                        </svg>
                        <!-- Desktop Icon -->
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                            stroke="currentColor" class="w-5 h-5 hidden peer-checked:block">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" />
                        </svg>
                    </label>
                </button>

                <!-- Light Mode -->
                <button onclick="setTheme('{{_id}}','light')" class="p-2 rounded-md hover:bg-gray-200"
                    title="Light mode">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="4" />
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41" />
                    </svg>
                </button>

                <!-- Dark Mode -->
                <button onclick="setTheme('{{_id}}','dark')" class="p-2 rounded-md hover:bg-gray-200" title="Dark mode">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                    </svg>
                </button>

                <!-- Fullscreen -->
                <button onclick="toggleComponentFullscreen('{{_id}}')" class="p-2 rounded-md hover:bg-gray-200"
                    title="Fullscreen">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                        stroke="currentColor" class="w-5 h-5">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                    </svg>
                </button>

            </div>

            <div class="h-6 w-px bg-gray-300"></div>

            <!-- Language -->
            <select class="text-sm font-medium bg-transparent focus:outline-none text-gray-700">
                <option>HTML</option>
            </select>

            <!-- Copy -->
            <button onclick="copyCode('{{_id}}')" class="p-2 rounded-md hover:bg-gray-200 text-gray-600"
                title="Copy code">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                    <rect x="9" y="9" width="13" height="13" rx="2" />
                    <path d="M5 15V5a2 2 0 012-2h10" />
                </svg>
            </button>

        </div>
    </div>

    <!-- Preview Panel -->
    <div id="preview-{{_id}}" class="bg-white rounded-xl p-6 transition-all duration-300">
        <div id="preview-inner-{{_id}}" class="w-full">
            <!-- Content will be rendered by JavaScript from elementsDescription -->
        </div>
    </div>

    <!-- Code Panel -->
    <div id="code-{{_id}}" class="hidden">
        <div class="bg-slate-900 rounded-xl p-6 overflow-auto">
            <pre
                class="text-sm text-slate-300 leading-relaxed"><code id="code-content-{{_id}}">{{htmlCode}}</code></pre>
        </div>
    </div>

</div>

```

### src/views/partials/navbar.handlebars

```
<header>
    <nav class="bg-white border-gray-200 px-4 lg:px-6 py-2.5 dark:bg-gray-800">
        <div class="flex flex-wrap justify-between items-center mx-auto max-w-screen-xl">
            <a href="https://flowbite.com" class="flex items-center">
                <img src="https://flowbite.com/docs/images/logo.svg" class="mr-3 h-6 sm:h-9" alt="Flowbite Logo" />
                <span class="self-center text-xl font-semibold whitespace-nowrap dark:text-white">Flowbite</span>
            </a>
            <div class="flex items-center lg:order-2">
                <a href="#"
                    class="text-gray-800 dark:text-white hover:bg-gray-50 focus:ring-4 focus:ring-gray-300 font-medium rounded-lg text-sm px-4 lg:px-5 py-2 lg:py-2.5 mr-2 dark:hover:bg-gray-700 focus:outline-none dark:focus:ring-gray-800">Log
                    in</a>
                <a href="#"
                    class="text-white bg-primary-700 hover:bg-primary-800 focus:ring-4 focus:ring-primary-300 font-medium rounded-lg text-sm px-4 lg:px-5 py-2 lg:py-2.5 mr-2 dark:bg-primary-600 dark:hover:bg-primary-700 focus:outline-none dark:focus:ring-primary-800">Get
                    started</a>
                <button data-collapse-toggle="mobile-menu-2" type="button"
                    class="inline-flex items-center p-2 ml-1 text-sm text-gray-500 rounded-lg lg:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-600"
                    aria-controls="mobile-menu-2" aria-expanded="false">
                    <span class="sr-only">Open main menu</span>
                    <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path fill-rule="evenodd"
                            d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                            clip-rule="evenodd"></path>
                    </svg>
                    <svg class="hidden w-6 h-6" fill="currentColor" viewBox="0 0 20 20"
                        xmlns="http://www.w3.org/2000/svg">
                        <path fill-rule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clip-rule="evenodd"></path>
                    </svg>
                </button>
            </div>
            <div class="hidden justify-between items-center w-full lg:flex lg:w-auto lg:order-1" id="mobile-menu-2">
                <ul class="flex flex-col mt-4 font-medium lg:flex-row lg:space-x-8 lg:mt-0">
                    <li>
                        <a href="#"
                            class="block py-2 pr-4 pl-3 text-white rounded bg-primary-700 lg:bg-transparent lg:text-primary-700 lg:p-0 dark:text-white"
                            aria-current="page">Home</a>
                    </li>
                    <li>
                        <a href="#"
                            class="block py-2 pr-4 pl-3 text-gray-700 border-b border-gray-100 hover:bg-gray-50 lg:hover:bg-transparent lg:border-0 lg:hover:text-primary-700 lg:p-0 dark:text-gray-400 lg:dark:hover:text-white dark:hover:bg-gray-700 dark:hover:text-white lg:dark:hover:bg-transparent dark:border-gray-700">Company</a>
                    </li>
                    <li>
                        <a href="#"
                            class="block py-2 pr-4 pl-3 text-gray-700 border-b border-gray-100 hover:bg-gray-50 lg:hover:bg-transparent lg:border-0 lg:hover:text-primary-700 lg:p-0 dark:text-gray-400 lg:dark:hover:text-white dark:hover:bg-gray-700 dark:hover:text-white lg:dark:hover:bg-transparent dark:border-gray-700">Marketplace</a>
                    </li>
                    <li>
                        <a href="#"
                            class="block py-2 pr-4 pl-3 text-gray-700 border-b border-gray-100 hover:bg-gray-50 lg:hover:bg-transparent lg:border-0 lg:hover:text-primary-700 lg:p-0 dark:text-gray-400 lg:dark:hover:text-white dark:hover:bg-gray-700 dark:hover:text-white lg:dark:hover:bg-transparent dark:border-gray-700">Features</a>
                    </li>
                    <li>
                        <a href="#"
                            class="block py-2 pr-4 pl-3 text-gray-700 border-b border-gray-100 hover:bg-gray-50 lg:hover:bg-transparent lg:border-0 lg:hover:text-primary-700 lg:p-0 dark:text-gray-400 lg:dark:hover:text-white dark:hover:bg-gray-700 dark:hover:text-white lg:dark:hover:bg-transparent dark:border-gray-700">Team</a>
                    </li>
                    <li>
                        <a href="#"
                            class="block py-2 pr-4 pl-3 text-gray-700 border-b border-gray-100 hover:bg-gray-50 lg:hover:bg-transparent lg:border-0 lg:hover:text-primary-700 lg:p-0 dark:text-gray-400 lg:dark:hover:text-white dark:hover:bg-gray-700 dark:hover:text-white lg:dark:hover:bg-transparent dark:border-gray-700">Contact</a>
                    </li>
                </ul>
            </div>
        </div>
    </nav>
</header>

```

### src/views/partials/sidebar.handlebars

```
<aside id="{{sidebarId}}"
    class="w-64 bg-white border-r border-gray-300 min-h-screen sticky top-0 overflow-y-auto transition-all duration-300 ease-in-out"
    style="margin-left: -256px;">

    <div class="p-6">
        <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Navigation</h3>
        <nav class="space-y-1">
            <a href="/"
                class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm {{#if (eq activePage 'home')}}bg-primary text-secondary font-semibold{{else}}text-gray-700 hover:bg-gray-100{{/if}}">
                <svg class="size-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                    stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round"
                        d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                </svg>
                Home
            </a>

            <a href="/documentation"
                class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm {{#if (eq activePage 'documentation')}}bg-primary text-secondary font-semibold{{else}}text-gray-700 hover:bg-gray-100{{/if}}">
                <svg class="size-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                    stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round"
                        d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                </svg>
                Documentation
            </a>

            <a href="/about"
                class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm {{#if (eq activePage 'about')}}bg-primary text-secondary font-semibold{{else}}text-gray-700 hover:bg-gray-100{{/if}}">
                <svg class="size-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                    stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round"
                        d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                </svg>
                About
            </a>

            {{#if user}}
            <a href="/my-components"
                class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm {{#if (eq activePage 'my-components')}}bg-primary text-secondary font-semibold{{else}}text-gray-700 hover:bg-gray-100{{/if}}">
                <svg class="size-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                    stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round"
                        d="M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 0 1-1.125-1.125v-3.75ZM14.25 8.625c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 0 1-1.125-1.125v-8.25ZM3.75 16.125c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 0 1-1.125-1.125v-2.25Z" />
                </svg>
                My Components
            </a>
            {{/if}}

            <a href="/support"
                class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm {{#if (eq activePage 'support')}}bg-primary text-secondary font-semibold{{else}}text-gray-700 hover:bg-gray-100{{/if}}">
                <svg class="size-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                    stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round"
                        d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
                </svg>
                Support
            </a>
        </nav>

        {{#if showCategoryInfo}}
        <!-- Divider -->
        <div class="my-6 border-t border-gray-200"></div>

        <!-- Current Category Info -->
        <div class="px-3 py-2 bg-gray-50 rounded-lg">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Current Category</p>
            <p class="text-sm font-medium text-gray-800">{{categoryName}}</p>
            <p class="text-xs text-gray-500 mt-1">{{componentCount}} components</p>
        </div>
        {{/if}}
    </div>
</aside>

```