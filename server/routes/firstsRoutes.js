import express from "express";
import {
    getFirstsAll,
    getFirstsById,
    getFirstsFew,
    getFirstsScore,
    getCumCount,
    getJuice,
    getJuicePerUser
} from "../controllers/firstsController.js";

const router = express.Router();

router.get("/score", getFirstsScore);
router.get("/cumcount", getCumCount);
router.get("/", getFirstsAll);
router.get("/:id", getFirstsById);
router.get("/limit/:limit", getFirstsFew);
router.get("/juice", getJuice);
router.get("/juice/members", getJuicePerUser);

export default router; 