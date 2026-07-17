import { Member } from '../models/model.members.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const member = new Member();

export const getMembersAll = asyncHandler(async (req, res) => {
    const result = await member.getAll();
    res.status(200).json(result);
});

export const getMemberById = asyncHandler(async (req, res) => {
    const result = await member.getById(req.params.id);
    res.status(200).json(result ?? null);
});
