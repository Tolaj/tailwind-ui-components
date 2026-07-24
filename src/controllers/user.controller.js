import * as userService from "../services/user.service.js";

export const createUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: "Name, email, and password are required" });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" });
        }

        const existingUser = await userService.getUserByEmail(email);
        if (existingUser) {
            return res.status(409).json({ message: "An account with this email already exists" });
        }

        const user = await userService.createUser({ name, email, password });
        const { password: _, ...userWithoutPassword } = user.toObject();
        res.status(201).json(userWithoutPassword);
    } catch (error) {
        res.status(400).json({ message: error.message || "Failed to create user" });
    }
};

export const getUsers = async (req, res) => {
    try {
        const users = await userService.getAllUsers();
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message || "Failed to fetch users" });
    }
};

export const userSignIn = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const user = await userService.getUserByEmail(email);

        if (!user) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        if (user.password !== password) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const { password: _, ...userData } = user.toObject();

        req.session.user = {
            id: userData._id,
            name: userData.name,
            email: userData.email,
        };

        return res.status(200).json({ message: "Sign-in successful!", userData: userData });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

