/**
 * Discord stores custom emoji in message content as <:name:id> or <a:name:id>
 * (animated). Matching only that form avoids false positives from display names
 * or bot text that embed shortcodes (e.g. username "Jack :emoji_51:").
 *
 * Plain ":name:" shortcodes are intentionally ignored — they are not how Discord
 * records an inserted custom emoji, and they collide with nicknames/mentions.
 */

/**
 * @param {string|null|undefined} content
 * @param {string} emojiName - emojis.emoji_name without surrounding colons
 * @returns {boolean}
 */
export function messageUsesCustomEmoji(content, emojiName) {
    if (content == null || emojiName == null || emojiName === '') return false;
    const text = String(content);
    const name = String(emojiName);
    return text.includes(`<:${name}:`) || text.includes(`<a:${name}:`);
}

/**
 * SQL predicate: message row `messageAlias` contains a Discord custom-emoji
 * token for `emojiAlias.emoji_name`. Aliases must be trusted identifiers.
 *
 * Uses LOCATE (not REGEXP) so cost stays comparable to the previous shortcode scan.
 *
 * @param {string} [messageAlias='m']
 * @param {string} [emojiAlias='emojis']
 * @returns {string}
 */
export function sqlMessageUsesCustomEmoji(messageAlias = 'm', emojiAlias = 'emojis') {
    return `(
                LOCATE(CONCAT('<:', ${emojiAlias}.emoji_name, ':'), ${messageAlias}.content) > 0
                OR LOCATE(CONCAT('<a:', ${emojiAlias}.emoji_name, ':'), ${messageAlias}.content) > 0
            )`;
}
