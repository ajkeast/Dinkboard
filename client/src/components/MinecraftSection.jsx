import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  useTheme,
} from "@mui/material";
import { SkinViewer } from "skinview3d";
import DashCard from "components/DashCard";
import { formatDate, formatDateTime } from "utils/datetime";

const PERIODS = [
  { key: "day", label: "Daily" },
  { key: "week", label: "Weekly" },
  { key: "month", label: "Monthly" },
  { key: "all", label: "All-time" },
];

const formatDuration = (seconds) => {
  if (seconds == null || Number.isNaN(Number(seconds))) return "—";
  const sign = Number(seconds) < 0 ? "-" : "";
  let left = Math.abs(Math.round(Number(seconds)));
  const days = Math.floor(left / 86400);
  left -= days * 86400;
  const hours = Math.floor(left / 3600);
  left -= hours * 3600;
  const minutes = Math.floor(left / 60);
  if (days > 0) return `${sign}${days}d ${hours}h`;
  if (hours > 0) return `${sign}${hours}h ${minutes}m`;
  return `${sign}${minutes}m`;
};

const formatDistance = (cm) => {
  const meters = Number(cm) / 100;
  if (!Number.isFinite(meters)) return "—";
  if (Math.abs(meters) >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters).toLocaleString()} m`;
};

const formatHearts = (raw) => {
  const hearts = Number(raw) / 20;
  if (!Number.isFinite(hearts)) return "—";
  return `${hearts.toFixed(1)} hearts`;
};

const formatCount = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return Math.round(n).toLocaleString();
};

const StatTile = ({ label, value, hint }) => {
  const theme = useTheme();
  return (
    <Box
      sx={{
        flex: "1 1 140px",
        minWidth: 120,
        px: 1.5,
        py: 1.25,
        borderRadius: `${theme.shape.borderRadius}px`,
        bgcolor:
          theme.palette.mode === "dark"
            ? theme.palette.white[1000]
            : theme.palette.grey[50],
        border: `1px solid ${theme.palette.divider}`,
      }}
    >
      <Typography variant="caption" color="text.secondary" display="block">
        {label}
      </Typography>
      <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.3 }}>
        {value}
      </Typography>
      {hint ? (
        <Typography variant="caption" color="text.secondary" display="block">
          {hint}
        </Typography>
      ) : null}
    </Box>
  );
};

const SkinCanvas = ({ uuid, skinUrl, name }) => {
  const canvasRef = useRef(null);
  const [failed, setFailed] = useState(false);
  const theme = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    let viewer;
    try {
      viewer = new SkinViewer({
        canvas,
        width: canvas.clientWidth || 240,
        height: canvas.clientHeight || 320,
        skin: "/skins/steve.png",
        enableControls: false,
      });
    } catch {
      setFailed(true);
      return undefined;
    }
    viewer.autoRotate = false;
    viewer.zoom = 0.82;
    viewer.fov = 35;
    viewer.background = theme.palette.mode === "dark" ? "#292929" : "#f0f0f0";

    const remote = skinUrl || (uuid ? `https://crafatar.com/skins/${uuid}` : null);
    if (remote) {
      viewer.loadSkin(remote).catch(() => {});
    }

    const onMove = (event) => {
      const rect = canvas.getBoundingClientRect();
      const dx = (event.clientX - (rect.left + rect.width / 2)) / Math.max(rect.width, 1);
      const dy = (event.clientY - (rect.top + rect.height * 0.35)) / Math.max(rect.height, 1);
      const clamp = (v, limit) => Math.max(-limit, Math.min(limit, v));
      viewer.playerWrapper.rotation.y = clamp(dx * 1.8, 1.05);
      viewer.playerObject.skin.head.rotation.y = clamp(dx * 1.15, 0.85);
      viewer.playerObject.skin.head.rotation.x = clamp(dy * 0.8, 0.45);
    };
    window.addEventListener("mousemove", onMove);
    const observer = new ResizeObserver(() => {
      const width = canvas.clientWidth || 240;
      const height = canvas.clientHeight || 320;
      viewer.setSize(width, height);
    });
    observer.observe(canvas);
    return () => {
      window.removeEventListener("mousemove", onMove);
      observer.disconnect();
      viewer.dispose();
    };
  }, [uuid, skinUrl, theme.palette.mode]);

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 260,
        height: 320,
        mx: "auto",
        borderRadius: `${theme.shape.borderRadius}px`,
        overflow: "hidden",
        bgcolor:
          theme.palette.mode === "dark"
            ? theme.palette.white[1000]
            : theme.palette.grey[50],
        border: `1px solid ${theme.palette.divider}`,
      }}
    >
      {failed ? (
        <Box height="100%" display="flex" alignItems="center" justifyContent="center" px={2}>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Skin preview is unavailable in this browser.
          </Typography>
        </Box>
      ) : (
        <Box
          component="canvas"
          ref={canvasRef}
          aria-label={`${name || "Minecraft"} player skin`}
          sx={{ width: "100%", height: "100%", display: "block" }}
        />
      )}
    </Box>
  );
};

const windowLabel = (period, windows) => {
  if (period === "all") return "Lifetime stats from the latest snapshot";
  const range = windows?.[period];
  if (!range?.from) return "No daily stats yet";
  if (range.from === range.to) return `Playday ${formatDate(range.from)}`;
  return `${formatDate(range.from)} – ${formatDate(range.to)}`;
};

const LoginTable = ({ logins }) => {
  const theme = useTheme();
  const rows = logins?.logins || [];
  return (
    <Box>
      <Typography variant="h6" fontWeight={600} mb={0.5}>
        Login locations
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
        Admin only. Each row is one IP this account has used.
      </Typography>
      {rows.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No logins recorded.
        </Typography>
      ) : (
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {["IP", "Location", "Network", "Flags", "Logins", "First", "Last"].map((label) => (
                  <TableCell key={label} sx={{ color: theme.palette.text.secondary, fontWeight: 600 }}>
                    {label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => {
                const place = [row.city, row.region, row.country].filter(Boolean).join(", ");
                const network = [row.isp, row.org && row.org !== row.isp ? row.org : null, row.asn]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <TableRow key={row.ip}>
                    <TableCell sx={{ fontFamily: "monospace", whiteSpace: "nowrap" }}>{row.ip}</TableCell>
                    <TableCell>{place || "—"}</TableCell>
                    <TableCell>{network || "—"}</TableCell>
                    <TableCell>{row.flags?.length ? row.flags.join(", ") : "—"}</TableCell>
                    <TableCell>{formatCount(row.count)}</TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDateTime(row.firstSeen)}</TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDateTime(row.lastSeen)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
      )}
    </Box>
  );
};

const MinecraftSection = ({ profile, logins, isAdmin }) => {
  const theme = useTheme();
  const [period, setPeriod] = useState("all");
  const stats = profile?.stats?.[period] || {};
  const topBlock = stats.topMinedBlock;
  const topMob = stats.topKillerMob;

  return (
    <DashCard id="minecraft-profile" sx={{ minWidth: 0, maxWidth: "100%", overflow: "hidden" }}>
      <CardContent sx={{ minWidth: 0 }}>
        <Box
          display="grid"
          gridTemplateColumns={{ xs: "1fr", md: "260px minmax(0, 1fr)" }}
          gap={2.5}
          alignItems="start"
        >
          <Box minWidth={0}>
            <SkinCanvas
              uuid={profile.player?.uuid}
              skinUrl={profile.skinUrl}
              name={profile.player?.name}
            />
            <Typography variant="h5" fontWeight={700} mt={1.5} noWrap>
              {profile.player?.name || "Minecraft"}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontFamily: "monospace", wordBreak: "break-all" }}
            >
              {profile.player?.uuid}
            </Typography>
          </Box>

          <Box minWidth={0}>
            <Box display="flex" flexWrap="wrap" gap={0.5} mb={1}>
              {PERIODS.map((opt) => {
                const selected = opt.key === period;
                return (
                  <Button
                    key={opt.key}
                    size="small"
                    variant={selected ? "contained" : "text"}
                    color={selected ? "secondary" : "inherit"}
                    onClick={() => setPeriod(opt.key)}
                    sx={{ fontWeight: selected ? 700 : 500, minWidth: 72 }}
                  >
                    {opt.label}
                  </Button>
                );
              })}
            </Box>
            <Typography variant="body2" color="text.secondary" mb={0.5}>
              {windowLabel(period, profile.windows)}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
              Playdays run 5:00 AM to 5:00 AM ET. Time in world is the vanilla
              playtime stat and includes idle time.
            </Typography>

            <Box display="flex" flexWrap="wrap" gap={1.25}>
              <StatTile label="Time in world" value={formatDuration(stats.playtimeSeconds)} />
              <StatTile
                label="Active"
                value={formatDuration(stats.activeSeconds)}
                hint={stats.activeSeconds == null ? "Recap sessions unavailable" : null}
              />
              <StatTile label="Deaths" value={formatCount(stats.deaths)} hint="Excludes rolled-back" />
              <StatTile label="Jumps" value={formatCount(stats.jumps)} />
              <StatTile label="Blocks mined" value={formatCount(stats.blocksMined)} />
              <StatTile label="Blocks placed" value={formatCount(stats.blocksPlaced)} />
              <StatTile label="Mob kills" value={formatCount(stats.mobKills)} />
              <StatTile label="Player kills" value={formatCount(stats.playerKills)} />
              <StatTile label="Distance" value={formatDistance(stats.distanceCm)} />
              <StatTile label="Items crafted" value={formatCount(stats.itemsCrafted)} />
              <StatTile label="Diamonds mined" value={formatCount(stats.diamondsMined)} />
              <StatTile label="Villager trades" value={formatCount(stats.villagerTrades)} />
              <StatTile label="Animals bred" value={formatCount(stats.animalsBred)} />
              <StatTile label="Fish caught" value={formatCount(stats.fishCaught)} />
              <StatTile label="Damage dealt" value={formatHearts(stats.damageDealt)} />
              <StatTile label="Damage taken" value={formatHearts(stats.damageTaken)} />
              <StatTile
                label="Top mined block"
                value={topBlock ? topBlock.name : "—"}
                hint={topBlock ? formatCount(topBlock.count) : null}
              />
              <StatTile
                label="Top killer mob"
                value={topMob ? topMob.name : "—"}
                hint={topMob ? formatCount(topMob.count) : null}
              />
            </Box>
          </Box>
        </Box>

        <Box mt={2.5}>
          <Typography variant="h6" fontWeight={600} mb={1}>
            Advancements
            <Box component="span" color="text.secondary" fontWeight={500} ml={1}>
              {profile.advancements?.length || 0}
            </Box>
          </Typography>
          {profile.advancements?.length ? (
            <Box
              display="flex"
              flexWrap="wrap"
              gap={0.75}
              sx={{ maxHeight: 220, overflowY: "auto" }}
            >
              {profile.advancements.map((adv) => (
                <Box
                  key={adv.id}
                  sx={{
                    px: 1.1,
                    py: 0.6,
                    borderRadius: `${theme.shape.borderRadius}px`,
                    border: `1px solid ${theme.palette.divider}`,
                    bgcolor:
                      theme.palette.mode === "dark"
                        ? theme.palette.white[1000]
                        : theme.palette.grey[50],
                  }}
                >
                  <Typography variant="body2" fontWeight={600}>
                    {adv.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {adv.earnedAt ? formatDate(adv.earnedAt) : adv.id}
                  </Typography>
                </Box>
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No advancements recorded.
            </Typography>
          )}
        </Box>

        {isAdmin ? (
          <Box mt={2.5}>
            <LoginTable logins={logins} />
          </Box>
        ) : null}
      </CardContent>
    </DashCard>
  );
};

export default MinecraftSection;
