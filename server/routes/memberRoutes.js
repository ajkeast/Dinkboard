import express from "express";
import {
    getMembersAll,
    getMemberById
} from "../controllers/memberController.js";

const router = express.Router();

router.get("/", getMembersAll);
router.get("/:id", getMemberById);

export default router; 