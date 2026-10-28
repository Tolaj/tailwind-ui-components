import { Router } from "express";
import { createUser, userSignIn, getLlmSettings, updateLlmSettings, createApiToken, revokeApiToken } from "../controllers/user.controller.js";
import { ensureAuthAPI } from "../middlewares/auth.js";

const router = Router();

router.route("/").post(createUser);
router.route("/sign-in").post(userSignIn);
router.route("/settings/llm").get(ensureAuthAPI, getLlmSettings).put(ensureAuthAPI, updateLlmSettings);

router.post("/api-token", ensureAuthAPI, createApiToken);
router.delete("/api-token", ensureAuthAPI, revokeApiToken);

export default router;
