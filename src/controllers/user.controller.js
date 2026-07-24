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
            llmEnabled: userData.llmSettings?.enabled || false,
        };

        return res.status(200).json({ message: "Sign-in successful!", userData: userData });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const getLlmSettings = async (req, res) => {
    try {
        const user = await userService.getUserById(req.session.user.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const settings = user.llmSettings || { enabled: false, provider: "anthropic", anthropicApiKey: "", localLlmUrl: "" };
        res.json({
            enabled: settings.enabled,
            provider: settings.provider,
            anthropicApiKey: settings.anthropicApiKey ? "••••" + settings.anthropicApiKey.slice(-4) : "",
            localLlmUrl: settings.localLlmUrl || "",
            hasAnthropicKey: !!settings.anthropicApiKey,
            hasLocalUrl: !!settings.localLlmUrl,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateLlmSettings = async (req, res) => {
    try {
        const { enabled, provider, anthropicApiKey, localLlmUrl } = req.body;

        if (provider && !["anthropic", "local"].includes(provider)) {
            return res.status(400).json({ message: "Provider must be 'anthropic' or 'local'" });
        }

        const user = await userService.getUserById(req.session.user.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (!user.llmSettings) {
            user.llmSettings = { enabled: false, provider: "anthropic", anthropicApiKey: "", localLlmUrl: "" };
        }

        if (typeof anthropicApiKey === "string") user.llmSettings.anthropicApiKey = anthropicApiKey;
        if (typeof localLlmUrl === "string") user.llmSettings.localLlmUrl = localLlmUrl;
        if (provider) user.llmSettings.provider = provider;

        if (enabled) {
            const p = provider || user.llmSettings.provider;
            if (p === "anthropic" && !user.llmSettings.anthropicApiKey) {
                return res.status(400).json({ message: "Anthropic API key is required to enable AI" });
            }
            if (p === "local" && !user.llmSettings.localLlmUrl) {
                return res.status(400).json({ message: "Local LLM URL is required to enable AI" });
            }
        }

        if (typeof enabled === "boolean") user.llmSettings.enabled = enabled;

        await user.save();

        req.session.user.llmEnabled = user.llmSettings.enabled;

        res.json({ message: "Settings saved", enabled: user.llmSettings.enabled, provider: user.llmSettings.provider });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

