import express from "express";
import {
    getCumCount,
    getFirstsAll,
    getFirstsById,
    getFirstsFew,
    getFirstsScore,
} from "../controllers/client.js";

const router = express.Router();

// FIRSTS
router.get("/score", getFirstsScore);
router.get("/cumcount", getCumCount);
router.get("/firsts", getFirstsAll);
router.get("/first/:id", getFirstsById);
router.get("/firsts/limit/:limit", getFirstsFew);

// MEMBERS

// JUICE

// MESSAGES

export default router;