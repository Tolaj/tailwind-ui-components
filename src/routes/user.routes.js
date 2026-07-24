import { Router } from "express";
import { createUser, userSignIn, getLlmSettings, updateLlmSettings } from "../controllers/user.controller.js";
import { ensureAuthAPI } from "../middlewares/auth.js";

const router = Router();

router.route("/").post(createUser);
router.route("/sign-in").post(userSignIn);
router.route("/settings/llm").get(ensureAuthAPI, getLlmSettings).put(ensureAuthAPI, updateLlmSettings);

export default router;
