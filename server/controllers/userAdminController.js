import { Users } from '../models/model.users.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../middleware/errorHandler.js';

export const listUsers = asyncHandler(async (req, res) => {
    const users = await Users.listAll();
    res.status(200).json(users);
});

export const updateUserRole = asyncHandler(async (req, res) => {
    const targetId = Number(req.params.id);
    const { role } = req.body;
    const actorId = Number(req.user.id);

    const target = await Users.findById(targetId);
    if (!target) {
        throw new ApiError(404, 'NOT_FOUND', 'User not found');
    }

    if (targetId === actorId && role !== 'admin') {
        throw new ApiError(400, 'LAST_ADMIN', 'You cannot remove your own admin role');
    }

    if (target.role === 'admin' && role !== 'admin') {
        const adminCount = await Users.countByRole('admin');
        if (adminCount <= 1) {
            throw new ApiError(400, 'LAST_ADMIN', 'Cannot demote the last admin');
        }
    }

    await Users.setRole(targetId, role);
    const updated = await Users.findById(targetId);
    res.status(200).json({ user: updated });
});

export const deleteUser = asyncHandler(async (req, res) => {
    const targetId = Number(req.params.id);
    const actorId = Number(req.user.id);

    if (targetId === actorId) {
        throw new ApiError(400, 'SELF_DELETE', 'You cannot delete your own account');
    }

    const target = await Users.findById(targetId);
    if (!target) {
        throw new ApiError(404, 'NOT_FOUND', 'User not found');
    }

    if (target.role === 'admin') {
        const adminCount = await Users.countByRole('admin');
        if (adminCount <= 1) {
            throw new ApiError(400, 'LAST_ADMIN', 'Cannot delete the last admin');
        }
    }

    await Users.deleteById(targetId);
    res.status(200).json({ success: true });
});
