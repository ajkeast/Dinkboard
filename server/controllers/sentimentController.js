import { Sentiment } from "../models/model.sentiment.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const sentiment = new Sentiment();

/** Explode comma-separated emotion bundles into per-emotion counts. */
export function explodeEmotions(bundles, limit = 12) {
    const counts = new Map();
    for (const row of bundles || []) {
        const raw = String(row.emotions || "").trim();
        if (!raw) continue;
        const n = Number(row.cnt) || 0;
        for (const part of raw.split(",")) {
            const emotion = part.trim().toLowerCase();
            if (!emotion) continue;
            counts.set(emotion, (counts.get(emotion) || 0) + n);
        }
    }
    return [...counts.entries()]
        .map(([emotion, count]) => ({ emotion, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
}

function rate(part, total) {
    if (!total) return 0;
    return part / total;
}

function pctMap(counts, total) {
    return {
        positive: rate(counts.positive_count, total),
        negative: rate(counts.negative_count, total),
        neutral: rate(counts.neutral_count, total),
        mixed: rate(counts.mixed_count, total),
    };
}

function toxicityMap(agg, total) {
    return {
        none: rate(agg.toxicity_none, total),
        mild: rate(agg.toxicity_mild, total),
        moderate: rate(agg.toxicity_moderate, total),
        severe: rate(agg.toxicity_severe, total),
    };
}

/**
 * Deterministic playful archetype from polarity + top emotions + sarcasm.
 */
export function buildVibeArchetype({ avgScore, polarity, topEmotions, sarcasmRate }) {
    const top = topEmotions?.[0]?.emotion || "neutral";
    const second = topEmotions?.[1]?.emotion;
    const pos = polarity?.positive || 0;
    const neg = polarity?.negative || 0;

    if (sarcasmRate >= 0.08) {
        return {
            label: "Sarcasm Merchant",
            blurb: "Half the punchlines land sideways — dry wit is the default mode.",
        };
    }
    if (avgScore >= 0.12 && (top === "joy" || top === "amusement" || second === "joy")) {
        return {
            label: "Sunny Optimist",
            blurb: "Mostly positive with a lot of joy and amusement.",
        };
    }
    if (avgScore <= -0.08 || (neg >= 0.28 && (top === "annoyance" || top === "anger" || top === "disgust"))) {
        return {
            label: "Resident Grump",
            blurb: "Runs a little spicy — annoyance and skepticism show up often.",
        };
    }
    if (top === "amusement" || second === "amusement") {
        return {
            label: "Chaos Comedian",
            blurb: "Here for the bits — amusement leads the vibe chart.",
        };
    }
    if (top === "sadness") {
        return {
            label: "Soft Heart",
            blurb: "More melancholy than mean — sadness peeks through the chat.",
        };
    }
    if (top === "surprise") {
        return {
            label: "Plot Twister",
            blurb: "Keeps landing on surprise — never quite the expected reply.",
        };
    }
    if (pos >= 0.28 && neg < 0.2) {
        return {
            label: "Good Vibes Only",
            blurb: "Positive polarity dominates; the chat stays on the bright side.",
        };
    }
    if (Math.abs(avgScore) < 0.04 && (polarity?.neutral || 0) >= 0.5) {
        return {
            label: "Even Keel",
            blurb: "Steady and mostly neutral — low drama, consistent tone.",
        };
    }
    return {
        label: "Mixed Signals",
        blurb: "A little of everything — polarity and emotions don't settle on one lane.",
    };
}

function shapePeriodStats(agg) {
    const total = agg.scored_count || 0;
    return {
        scoredCount: total,
        avgScore: agg.avg_score,
        polarity: pctMap(agg, total),
        polarityCounts: {
            positive: agg.positive_count,
            negative: agg.negative_count,
            neutral: agg.neutral_count,
            mixed: agg.mixed_count,
        },
        sarcasmRate: rate(agg.sarcasm_count, total),
        toxicityRate: rate(
            agg.toxicity_mild + agg.toxicity_moderate + agg.toxicity_severe,
            total
        ),
        toxicity: toxicityMap(agg, total),
    };
}

export const getVibeStats = asyncHandler(async (req, res) => {
    const { range } = req.query;
    const raw = await sentiment.getStats(range);
    res.status(200).json({
        range: raw.range,
        startDate: raw.startDate,
        endDate: raw.endDate,
        priorStartDate: raw.priorStartDate,
        priorEndDate: raw.priorEndDate,
        current: shapePeriodStats(raw.current),
        prior: shapePeriodStats(raw.prior),
    });
});

export const getVibeTimeline = asyncHandler(async (req, res) => {
    const { range } = req.query;
    const result = await sentiment.getTimeline(range);
    res.status(200).json(result);
});

export const getVibeEmotions = asyncHandler(async (req, res) => {
    const { range } = req.query;
    const bundles = await sentiment.getEmotionBundles(range);
    res.status(200).json({
        range,
        emotions: explodeEmotions(bundles),
    });
});

export const getVibeMembers = asyncHandler(async (req, res) => {
    const { range } = req.query;
    const result = await sentiment.getMembers(range);
    const members = result.members.map((m) => {
        const polarity = pctMap(m, m.scored_count);
        const topEmotions = []; // filled lightly — board doesn't need full explode per row
        const archetype = buildVibeArchetype({
            avgScore: m.avg_score,
            polarity,
            topEmotions,
            sarcasmRate: m.sarcasm_rate,
        });
        return {
            ...m,
            polarity,
            label: archetype.label,
        };
    });
    res.status(200).json({ ...result, members });
});

export const getMemberVibe = asyncHandler(async (req, res) => {
    const { memberId } = req.params;
    const range = req.query.range || null;

    const [agg, bundles] = await Promise.all([
        sentiment.getMemberAgg(memberId, range),
        range
            ? sentiment.getEmotionBundles(range, memberId)
            : sentiment.getAllTimeEmotionBundles(memberId),
    ]);

    const total = agg.scored_count || 0;
    const polarity = pctMap(agg, total);
    const topEmotions = explodeEmotions(bundles, 8);
    const sarcasmRate = rate(agg.sarcasm_count, total);
    const archetype = buildVibeArchetype({
        avgScore: agg.avg_score,
        polarity,
        topEmotions,
        sarcasmRate,
    });

    res.status(200).json({
        memberId: String(memberId),
        range: range || "all",
        label: archetype.label,
        blurb: archetype.blurb,
        avgScore: agg.avg_score,
        polarity,
        polarityCounts: {
            positive: agg.positive_count,
            negative: agg.negative_count,
            neutral: agg.neutral_count,
            mixed: agg.mixed_count,
        },
        topEmotions,
        sarcasmRate,
        toxicity: toxicityMap(agg, total),
        scoredMessages: total,
    });
});
