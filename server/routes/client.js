import express from "express";
import {
    getFirstsAll,
    getFirstsById,
    getFirstsScore,
    getFirstsSome,
} from "../controllers/client.js";

const router = express.Router();

// FIRSTS
router.get("/score", getFirstsScore);
router.get("/firsts", getFirstsAll);
router.get("/first/:id", getFirstsById);
router.get("/firsts/limit/:limit", getFirstsSome);

// MEMBERS

// JUICE

// MESSAGES

export default router;