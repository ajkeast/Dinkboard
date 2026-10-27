import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { currentMessageTextSql } from '../models/messageText.js';
import { db } from '../models/database.js';
import { registerAgent, cleanupUsersByEmail } from './helpers.js';

const MEMBER_ID = '801000000000001';
const CHANNEL_ID = '801000000000002';
const MSG_PLAIN = '801000000000011';
const MSG_EDITED = '801000000000012';
const EMOJI_KEEP = '801000000000021';
const EMOJI_GONE = '801000000000022';
const EMOJI_KEEP_NAME = 'dinkboard_test_keep';
const EMOJI_GONE_NAME = 'dinkboard_test_gone';
const EDITED_AT = '2026-03-01 15:04:05';

function modelSource(name) {
    return readFileSync(
        fileURLToPath(new URL(`../models/${name}`, import.meta.url)),
        'utf8'
    );
}

async function cleanupFixtures() {
    await db.query(
        'DELETE FROM message_sentiment WHERE message_id IN (?, ?)',
        [MSG_PLAIN, MSG_EDITED]
    );
    await db.query('DELETE FROM messages WHERE id IN (?, ?)', [MSG_PLAIN, MSG_EDITED]);
    await db.query('DELETE FROM emojis WHERE id IN (?, ?)', [EMOJI_KEEP, EMOJI_GONE]);
    await db.query('DELETE FROM channels WHERE id = ?', [CHANNEL_ID]);
    await db.query('DELETE FROM members WHERE id = ?', [MEMBER_ID]);
}

describe('current message text expression', () => {
    it('prefers edited_content and falls back to the original', () => {
        expect(currentMessageTextSql('messages')).toBe(
            'COALESCE(messages.edited_content, messages.content)'
        );
        expect(currentMessageTextSql('m')).toBe(
            'COALESCE(m.edited_content, m.content)'
        );
    });

    it('rejects aliases that are not identifiers', () => {
        expect(() => currentMessageTextSql('m.content')).toThrow(/alias/i);
        expect(() => currentMessageTextSql('m;drop')).toThrow(/alias/i);
    });

    it('keeps sentiment tied to the original wording', () => {
        const sentiment = modelSource('model.sentiment.js');
        expect(sentiment).not.toMatch(/edited_content|edited_at/);
        expect(sentiment).toMatch(/JOIN messages m ON m\.id = ms\.message_id/);
    });
});

describe('message text reads (synthetic rows)', () => {
    let agent;
    let creds;

    beforeAll(async () => {
        await cleanupFixtures();
        await db.query(
            `INSERT INTO members (id, user_name, display_name)
             VALUES (?, 'edit_fixture', 'Edit Fixture')`,
            [MEMBER_ID]
        );
        await db.query(
            `INSERT INTO channels (id, channel_name) VALUES (?, 'edit-fixture')`,
            [CHANNEL_ID]
        );
        await db.query(
            `INSERT INTO emojis (id, emoji_name, url) VALUES
                (?, ?, 'http://example.invalid/keep.png'),
                (?, ?, 'http://example.invalid/gone.png')`,
            [EMOJI_KEEP, EMOJI_KEEP_NAME, EMOJI_GONE, EMOJI_GONE_NAME]
        );
        // Never edited: current text is the original, which still contains the "gone" emoji.
        await db.query(
            `INSERT INTO messages (id, member_id, channel_id, content, edited_content, edited_at, created_at)
             VALUES (?, ?, ?, ?, NULL, NULL, '2024-06-01 00:00:00')`,
            [MSG_PLAIN, MEMBER_ID, CHANNEL_ID, `plain :${EMOJI_GONE_NAME}: hello`]
        );
        // Edited: original lost the "gone" emoji; the current text gained "keep".
        await db.query(
            `INSERT INTO messages (id, member_id, channel_id, content, edited_content, edited_at, created_at)
             VALUES (?, ?, ?, ?, ?, ?, '2024-06-02 00:00:00')`,
            [
                MSG_EDITED,
                MEMBER_ID,
                CHANNEL_ID,
                `before :${EMOJI_GONE_NAME}:`,
                `after :${EMOJI_KEEP_NAME}:`,
                EDITED_AT,
            ]
        );
        await db.query(
            `INSERT INTO message_sentiment (
                message_id, polarity, polarity_score, emotions, sarcasm,
                toxicity, directed_at, confidence, rationale, model
             ) VALUES (?, 'positive', 0.5, 'joy', FALSE, 'none', 'general', 0.9, 'fixture', 'test-model')`,
            [MSG_EDITED]
        );
        ({ agent, creds } = await registerAgent());
    }, 60000);

    afterAll(async () => {
        await cleanupFixtures();
        if (creds?.email) await cleanupUsersByEmail(creds.email);
    });

    it('GET /api/messages/:id returns current text and an edited flag', async () => {
        const plain = await agent.get(`/api/messages/${MSG_PLAIN}`);
        expect(plain.status).toBe(200);
        expect(plain.body).toMatchObject({
            id: MSG_PLAIN,
            user_name: 'Edit Fixture',
            channel_name: '#edit-fixture',
            content: `plain :${EMOJI_GONE_NAME}: hello`,
            edited: false,
            edited_at: null,
        });

        const edited = await agent.get(`/api/messages/${MSG_EDITED}`);
        expect(edited.status).toBe(200);
        expect(edited.body).toMatchObject({
            id: MSG_EDITED,
            content: `after :${EMOJI_KEEP_NAME}:`,
            edited: true,
        });
        expect(edited.body.content).not.toBe(`before :${EMOJI_GONE_NAME}:`);
        expect(edited.body.edited_at).toBe('2026-03-01T15:04:05.000Z');
    });

    it('GET /api/messages lists the same current text', async () => {
        const res = await agent.get('/api/messages');
        expect(res.status).toBe(200);
        const byId = Object.fromEntries(res.body.map((row) => [row.id, row]));
        expect(byId[MSG_PLAIN].content).toBe(`plain :${EMOJI_GONE_NAME}: hello`);
        expect(byId[MSG_PLAIN].edited).toBe(false);
        expect(byId[MSG_EDITED].content).toBe(`after :${EMOJI_KEEP_NAME}:`);
        expect(byId[MSG_EDITED].edited).toBe(true);
    });

    it('emoji counts follow the current text, not the original', async () => {
        const count = await agent.get('/api/emojis/count');
        expect(count.status).toBe(200);
        const occurences = Object.fromEntries(
            count.body.map((row) => [row.emoji_name, row.occurences])
        );
        // Unedited row still shows "gone". Edited row shows "keep" only.
        expect(occurences[EMOJI_GONE_NAME]).toBe(1);
        expect(occurences[EMOJI_KEEP_NAME]).toBe(1);

        const all = await agent.get('/api/emojis');
        expect(all.status).toBe(200);
        const occurrences = Object.fromEntries(
            all.body.map((row) => [row.emoji_name, row.occurrences])
        );
        expect(occurrences[EMOJI_GONE_NAME]).toBe(1);
        expect(occurrences[EMOJI_KEEP_NAME]).toBe(1);
    });

    it('sentiment still scores the edited message by id, without reading its text', async () => {
        const res = await agent.get(`/api/vibes/member/${MEMBER_ID}`);
        expect(res.status).toBe(200);
        expect(res.body.scoredMessages).toBe(1);
        expect(res.body.avgScore).toBe(0.5);
        expect(res.body.memberId).toBe(MEMBER_ID);
    });
});
