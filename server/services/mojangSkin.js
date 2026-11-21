const CACHE_OK_MS = 6 * 60 * 60 * 1000;
const CACHE_MISS_MS = 10 * 60 * 1000;
const cache = new Map();

function bareUuid(uuid) {
    return String(uuid || '').replace(/-/g, '');
}

/**
 * Mojang session server → textures.minecraft.net skin URL.
 * Failures return null so the profile still renders (the client falls back).
 */
export async function lookupSkin(uuid) {
    const id = bareUuid(uuid);
    if (id.length !== 32) return null;
    const hit = cache.get(id);
    if (hit && hit.until > Date.now()) return hit.url;

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 1500);
    try {
        const res = await fetch(
            `https://sessionserver.mojang.com/session/minecraft/profile/${id}`,
            { signal: ctrl.signal }
        );
        if (!res.ok) {
            cache.set(id, { url: null, until: Date.now() + CACHE_MISS_MS });
            return null;
        }
        const body = await res.json();
        const prop = (body.properties || []).find((p) => p.name === 'textures');
        if (!prop?.value) {
            cache.set(id, { url: null, until: Date.now() + CACHE_MISS_MS });
            return null;
        }
        const decoded = JSON.parse(Buffer.from(prop.value, 'base64').toString('utf8'));
        const url = decoded?.textures?.SKIN?.url || null;
        cache.set(id, { url, until: Date.now() + (url ? CACHE_OK_MS : CACHE_MISS_MS) });
        return url;
    } catch {
        cache.set(id, { url: null, until: Date.now() + CACHE_MISS_MS });
        return null;
    } finally {
        clearTimeout(timer);
    }
}
