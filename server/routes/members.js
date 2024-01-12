import express from "express";
import {
    getMembersAll,
    getMemberById,
} from "../controllers/members.js";

const router = express.Router();

router.get("/members", getMembersAll);
router.get("/member/:id", getMemberById);

export default router;