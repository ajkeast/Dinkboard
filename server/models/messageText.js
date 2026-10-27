const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * SQL expression for the text currently shown in Discord.
 * `content` is the original wording and is never overwritten.
 * `edited_content` is the latest real edit, or NULL when the message was never edited
 * (including historical rows). COALESCE therefore matches what the site showed
 * when edits used to overwrite `content`.
 */
export function currentMessageTextSql(alias = 'messages') {
    if (!IDENT.test(alias)) {
        throw new Error(`Invalid SQL alias: ${alias}`);
    }
    return `COALESCE(${alias}.edited_content, ${alias}.content)`;
}
