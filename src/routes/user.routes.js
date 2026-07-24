import { Router } from "express";
import { createUser, userSignIn } from "../controllers/user.controller.js";

const router = Router();

router.route("/").post(createUser);
router.route("/sign-in").post(userSignIn);

export default router;
