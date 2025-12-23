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
