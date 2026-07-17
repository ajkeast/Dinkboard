import { Dinkcoin } from "../models/model.dinkcoin.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const dinkcoin = new Dinkcoin();

export const getBalances = asyncHandler(async (req, res) => {
    const result = await dinkcoin.getBalances();
    res.status(200).json(result);
});

export const getTransactions = asyncHandler(async (req, res) => {
    const limit = req.query.limit ?? 100;
    const result = await dinkcoin.getTransactions(limit);
    res.status(200).json(result);
});
