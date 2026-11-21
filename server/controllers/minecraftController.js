import { ApiError } from '../middleware/errorHandler.js';
import { minecraftProfile } from '../models/model.minecraft.js';
import { lookupSkin } from '../services/mojangSkin.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getMemberMinecraft = asyncHandler(async (req, res) => {
    const profile = await minecraftProfile.getProfile(req.params.id);
    if (!profile.linked) {
        res.status(200).json({ linked: false });
        return;
    }
    let skinUrl = null;
    if (process.env.NODE_ENV !== 'test') {
        skinUrl = await lookupSkin(profile.player.uuid);
    }
    res.status(200).json({ ...profile, skinUrl });
});

export const getMemberMinecraftLogins = asyncHandler(async (req, res) => {
    const result = await minecraftProfile.getLogins(req.params.id);
    if (!result) {
        throw new ApiError(404, 'NOT_FOUND', 'No Minecraft account is linked to this member');
    }
    res.status(200).json(result);
});
