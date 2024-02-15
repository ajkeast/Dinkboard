import express from "express";
import {
    getCumCount,
    getFirstsAll,
    getFirstsById,
    getFirstsFew,
    getFirstsScore,
    getMembersAll,
    getMemberById,
    getEmojisAll,
    getEmojisById,
    getEmojisCount,
    getMessagesAll,
    getMessageById
} from "../controllers/client.js";

const router = express.Router();

// FIRSTS
router.get("/score", getFirstsScore);
router.get("/cumcount", getCumCount);
router.get("/firsts", getFirstsAll);
router.get("/first/:id", getFirstsById);
router.get("/firsts/limit/:limit", getFirstsFew);

// MEMBERS
router.get("/members", getMembersAll);
router.get("/member/:id", getMemberById);

// EMOJIS
router.get("/emojis", getEmojisAll),
router.get("/emojis/count", getEmojisCount),
router.get("/emoji/:id", getEmojisById)

// MESSAGES
router.get("/messages", getMessagesAll)
router.get("/message/:id", getMessageById)

// JUICE



export default router;