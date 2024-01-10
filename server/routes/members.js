import express from "express";
import {
    getMembers,
    getMember,
} from "../controllers/members.js";

const router = express.Router();

router.get("/members", getMembers);
router.get("/member/:id", getMember);

export default router;