-- Link Minecraft accounts to Discord members.
-- Apply manually AFTER deploy/postgres/minecraft.sql. Not a startup migration.
--
--   docker exec -i dinkboard-postgres \
--     psql -U dinkboard -d dinkboard -v ON_ERROR_STOP=1 \
--     < deploy/postgres/minecraft_player_links.sql
--
-- Rows whose discord_user_id is not already in public.members are skipped,
-- so this is a no-op on an empty database. Idempotent: re-running updates
-- the name and Discord id for an existing Minecraft UUID.
-- Source: operator mapping (minecraft_name, minecraft_uuid, discord_user_id).

INSERT INTO minecraft.player_links (minecraft_uuid, discord_user_id, minecraft_name)
SELECT v.minecraft_uuid, v.discord_user_id, v.minecraft_name
FROM (VALUES
  ('fb831543-2cc9-4929-b7da-34bd2aed5daa', '162725160397438978', 'Conkeastador'),
  ('2c053059-2f7d-4831-a4c6-c9838af825c7', '94235023560941568', 'EpicPigz'),
  ('d4b6124f-dfcc-40e7-b09e-d630a0a693f7', '186667084007211008', 'samtyclaws'),
  ('30bd0049-6903-4690-afb5-4c4b72e426f7', '163124059826028544', 'NiftyNarwhalz'),
  ('22df0076-bf42-4578-a777-995f5e0b51ed', '1242970919190925315', 'LeNelli'),
  ('2a30cc5b-e5b9-46e4-ae3d-a3c00688de48', '119872477299081216', 'TORNADOTOM50'),
  ('9e87a4ac-0be5-4548-906f-bd15e3a37b44', '94254577766891520', 'Goated'),
  ('f3b76f36-1c5b-4299-8c09-5bc935907e29', '95321829031280640', 'jphelps')
) AS v(minecraft_uuid, discord_user_id, minecraft_name)
WHERE EXISTS (
  SELECT 1 FROM members m WHERE m.id = v.discord_user_id
)
ON CONFLICT (minecraft_uuid) DO UPDATE
SET discord_user_id = EXCLUDED.discord_user_id,
    minecraft_name = EXCLUDED.minecraft_name;
