import { Emojis } from '../models/model.emojis.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const emojis = new Emojis();

export const getEmojisAll = asyncHandler(async (req, res) => {
    const result = await emojis.getAll();
    res.status(200).json(result);
});

export const getEmojisCount = asyncHandler(async (req, res) => {
    const result = await emojis.getCount();
    res.status(200).json(result);
});

export const getEmojisById = asyncHandler(async (req, res) => {
    const result = await emojis.getById(req.params.id);
    res.status(200).json(result ?? null);
});
