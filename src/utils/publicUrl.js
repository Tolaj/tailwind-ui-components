/** Public base URL of this server. Set PUBLIC_URL in production (behind a proxy or custom domain). */
export const publicBase = (req) => (process.env.PUBLIC_URL || `${req.protocol}://${req.get("host")}`).replace(/\/+$/, "");
