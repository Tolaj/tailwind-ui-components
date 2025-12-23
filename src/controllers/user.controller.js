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

