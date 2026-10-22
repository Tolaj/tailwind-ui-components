export const isValidEmail = (email) => {
    if (!email || typeof email !== "string") throw new Error("Email is required");
    email = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) throw new Error("Invalid email format");
    return email;
};
