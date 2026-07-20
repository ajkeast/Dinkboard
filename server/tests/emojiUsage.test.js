import { describe, it, expect } from 'vitest';
import {
    messageUsesCustomEmoji,
    sqlMessageUsesCustomEmoji,
} from '../utils/emojiUsage.js';

describe('messageUsesCustomEmoji', () => {
    it('counts Discord static and animated custom emoji markup', () => {
        expect(messageUsesCustomEmoji('nice <:emoji_51:123456789>', 'emoji_51')).toBe(true);
        expect(messageUsesCustomEmoji('lol <a:emoji_51:123456789>', 'emoji_51')).toBe(true);
        expect(
            messageUsesCustomEmoji('both <:emoji_51:1> and <a:emoji_51:2>', 'emoji_51')
        ).toBe(true);
    });

    it('does not count shortcodes inside usernames or @mentions', () => {
        expect(messageUsesCustomEmoji('@Jack :emoji_51: you are up', 'emoji_51')).toBe(false);
        expect(messageUsesCustomEmoji('Jack :emoji_51: joined first game', 'emoji_51')).toBe(
            false
        );
        expect(messageUsesCustomEmoji('hello :emoji_51:', 'emoji_51')).toBe(false);
    });

    it('does not match a different emoji name', () => {
        expect(messageUsesCustomEmoji('<:emoji_52:999>', 'emoji_51')).toBe(false);
        // Prefix of a longer name must not match (:emoji_5: vs :emoji_51:)
        expect(messageUsesCustomEmoji('<:emoji_51:999>', 'emoji_5')).toBe(false);
    });

    it('handles empty / null inputs', () => {
        expect(messageUsesCustomEmoji(null, 'emoji_51')).toBe(false);
        expect(messageUsesCustomEmoji('<:emoji_51:1>', '')).toBe(false);
        expect(messageUsesCustomEmoji('<:emoji_51:1>', null)).toBe(false);
    });
});

describe('sqlMessageUsesCustomEmoji', () => {
    it('builds a LOCATE predicate for Discord custom-emoji markup', () => {
        const sql = sqlMessageUsesCustomEmoji('m', 'emojis');
        expect(sql).toContain("LOCATE(CONCAT('<:', emojis.emoji_name, ':'), m.content) > 0");
        expect(sql).toContain("LOCATE(CONCAT('<a:', emojis.emoji_name, ':'), m.content) > 0");
        expect(sql).not.toContain("CONCAT(':', emojis.emoji_name, ':')");
    });
});
