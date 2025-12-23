import { Router } from "express";
import { getUsers, createUser, userSignIn } from "../controllers/user.controller.js";

const router = Router();

router.route("/").get(getUsers).post(createUser)

router.route("/sign-in").post(userSignIn)



export default router;
