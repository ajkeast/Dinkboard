import React, { useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import {
  Box,
  Button,
  CardContent,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  ArrowBackRounded,
  LocalFireDepartmentRounded,
  MessageRounded,
  EmojiEventsRounded,
  CalendarMonthRounded,
  Tag,
} from "@mui/icons-material";
import DashCard from "components/DashCard";
import ContributionHeatmap from "components/ContributionHeatmap";
import MemberChannelsChart from "components/MemberChannelsChart";
import QueryState from "components/QueryState";
import {
  useGetMemberQuery,
  useGetMessagesByDayQuery,
  useGetMessagesChannelsByMemberQuery,
  useGetMessagesMemberSummaryQuery,
  useGetScoreQuery,
  useGetJuiceByMemberQuery,
  getApiErrorMessage,
} from "state/api";
import {
  buildYearOptions,
  computeStreaks,
  formatCompactCount,
  rollingYearRange,
} from "utils/memberActivity";

const StatTile = ({ label, value, icon }) => {
  const theme = useTheme();
  return (
    <Box
      sx={{
        flex: "1 1 120px",
        minWidth: 110,
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
      <Box display="flex" alignItems="center" gap={0.75} mb={0.5}>
        {icon}
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
      </Box>
      <Typography variant="h5" fontWeight={700}>
        {value}
      </Typography>
    </Box>
  );
};

const MemberAvatar = ({ avatar, name, size = 96 }) => {
  const theme = useTheme();
  const [failed, setFailed] = useState(false);
  const showImg = avatar && !failed;

  return (
    <Box position="relative" width={size} height={size} flexShrink={0}>
      {showImg ? (
        <Box
          component="img"
          alt=""
          src={avatar}
          width={size}
          height={size}
          borderRadius="50%"
          sx={{
            objectFit: "cover",
            bgcolor: theme.palette.grey[800],
            border: `3px solid ${theme.palette.background.alt}`,
            boxShadow: theme.customShadows.card,
          }}
          onError={() => setFailed(true)}
        />
      ) : (
        <Box
          width={size}
          height={size}
          borderRadius="50%"
          display="flex"
          alignItems="center"
          justifyContent="center"
          sx={{
            bgcolor:
              theme.palette.mode === "dark"
                ? theme.palette.secondary[700]
                : theme.palette.secondary[100],
            color:
              theme.palette.mode === "dark"
                ? theme.palette.secondary[100]
                : theme.palette.secondary[700],
            fontWeight: 700,
            fontSize: size * 0.35,
            border: `3px solid ${theme.palette.background.alt}`,
            boxShadow: theme.customShadows.card,
          }}
        >
          {(name || "?").charAt(0).toUpperCase()}
        </Box>
      )}
    </Box>
  );
};

const MemberProfile = () => {
  const { id } = useParams();
  const theme = useTheme();
  const isMd = useMediaQuery("(min-width: 900px)");

  const {
    data: member,
    isLoading: isMemberLoading,
    error: memberError,
    refetch: refetchMember,
  } = useGetMemberQuery(id, { skip: !id });

  const {
    data: summary,
    isLoading: isSummaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = useGetMessagesMemberSummaryQuery(id, { skip: !id });

  const {
    data: channels,
    isLoading: isChannelsLoading,
    error: channelsError,
    refetch: refetchChannels,
  } = useGetMessagesChannelsByMemberQuery(id, { skip: !id });

  const { data: scoreData } = useGetScoreQuery();
  const { data: juiceData } = useGetJuiceByMemberQuery();

  const yearOptions = useMemo(
    () =>
      buildYearOptions(
        summary?.first_message_date,
        summary?.last_message_date
      ),
    [summary]
  );

  const [selectedKey, setSelectedKey] = useState("last");

  useEffect(() => {
    setSelectedKey("last");
  }, [id]);

  const range = useMemo(() => {
    const found = yearOptions.find((o) => o.key === selectedKey);
    return found || rollingYearRange();
  }, [yearOptions, selectedKey]);

  const {
    data: dailyData,
    isLoading: isDailyLoading,
    error: dailyError,
    refetch: refetchDaily,
  } = useGetMessagesByDayQuery(
    {
      memberId: id,
      startDate: range.startDate,
      endDate: range.endDate,
    },
    { skip: !id || !range.startDate }
  );

  const firsts = useMemo(() => {
    if (!scoreData || !id) return 0;
    return Number(scoreData.find((s) => s.user_id === id)?.firsts) || 0;
  }, [scoreData, id]);

  const juice = useMemo(() => {
    if (!juiceData || !id) return 0;
    return Number(juiceData.find((j) => j.user_id === id)?.total_juice) || 0;
  }, [juiceData, id]);

  const streaks = useMemo(
    () => computeStreaks(dailyData, range.endDate),
    [dailyData, range.endDate]
  );

  const displayName = member?.display_name || member?.user_name || "Member";

  if (!id) {
    return (
      <Typography color="text.secondary">Missing member id</Typography>
    );
  }

  if (!isMemberLoading && (memberError || member == null)) {
    return (
      <Box>
        <Button
          component={RouterLink}
          to="/members"
          startIcon={<ArrowBackRounded />}
          sx={{ mb: 2 }}
        >
          Members
        </Button>
        <QueryState
          isLoading={false}
          error={memberError || { error: "Member not found" }}
          onRetry={refetchMember}
        />
        {memberError && (
          <Typography variant="caption" color="text.secondary" mt={1} display="block">
            {getApiErrorMessage(memberError)}
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <Box>
      <Button
        component={RouterLink}
        to="/members"
        startIcon={<ArrowBackRounded />}
        size="small"
        sx={{ mb: 1.5 }}
      >
        Members
      </Button>

      <Box
        display="grid"
        gridTemplateColumns={isMd ? "260px minmax(0, 1fr)" : "minmax(0, 1fr)"}
        gap={2}
        alignItems="start"
        sx={{ width: "100%", maxWidth: "100%", overflowX: "hidden" }}
      >
        {/* Left column — identity (GitHub-style) */}
        <DashCard sx={{ minWidth: 0, maxWidth: "100%", overflow: "hidden" }}>
          <CardContent
            sx={{
              display: "flex",
              flexDirection: isMd ? "column" : "row",
              alignItems: isMd ? "stretch" : "center",
              gap: 2,
              minWidth: 0,
            }}
          >
            {isMemberLoading ? (
              <Box
                width={96}
                height={96}
                borderRadius="50%"
                sx={{ bgcolor: theme.palette.action.hover }}
              />
            ) : (
              <MemberAvatar avatar={member.avatar} name={displayName} />
            )}
            <Box flex={1} minWidth={0}>
              <Typography variant="h4" fontWeight={700} noWrap>
                {isMemberLoading ? "…" : displayName}
              </Typography>
              <Typography
                variant="h6"
                color="text.secondary"
                fontWeight={400}
                noWrap
              >
                {isMemberLoading ? "" : `@${member.user_name}`}
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={1.5}>
                Joined {member?.created_at || "—"}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  fontFamily: "monospace",
                  display: "block",
                  mt: 0.5,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {id}
              </Typography>
            </Box>
          </CardContent>
        </DashCard>

        {/* Right column — activity */}
        <Box
          display="flex"
          flexDirection="column"
          gap={2}
          sx={{ minWidth: 0, maxWidth: "100%" }}
        >
          <Box display="flex" flexWrap="wrap" gap={1.25} sx={{ minWidth: 0 }}>
            <StatTile
              label="Messages"
              value={formatCompactCount(summary?.total_messages)}
              icon={
                <MessageRounded
                  sx={{ fontSize: 16, color: theme.palette.secondary[400] }}
                />
              }
            />
            <StatTile
              label="Firsts"
              value={formatCompactCount(firsts)}
              icon={
                <EmojiEventsRounded
                  sx={{ fontSize: 16, color: theme.palette.secondary[400] }}
                />
              }
            />
            <StatTile
              label="Juice"
              value={formatCompactCount(juice)}
              icon={
                <LocalFireDepartmentRounded
                  sx={{ fontSize: 16, color: theme.palette.secondary[400] }}
                />
              }
            />
            <StatTile
              label="Active days"
              value={formatCompactCount(summary?.active_days)}
              icon={
                <CalendarMonthRounded
                  sx={{ fontSize: 16, color: theme.palette.secondary[400] }}
                />
              }
            />
            <StatTile
              label="Current streak"
              value={streaks.currentStreak}
              icon={
                <LocalFireDepartmentRounded
                  sx={{ fontSize: 16, color: theme.palette.green.default }}
                />
              }
            />
            <StatTile
              label="Longest streak"
              value={streaks.longestStreak}
              icon={
                <LocalFireDepartmentRounded
                  sx={{ fontSize: 16, color: theme.palette.green.default }}
                />
              }
            />
          </Box>

          <DashCard sx={{ minWidth: 0, maxWidth: "100%", overflow: "hidden" }}>
            <CardContent sx={{ minWidth: 0, overflow: "hidden" }}>
              <Typography variant="h6" fontWeight={600} mb={1.5}>
                Contribution activity
              </Typography>

              <Box
                display="flex"
                flexDirection={isMd ? "row" : "column"}
                gap={1.5}
                alignItems={isMd ? "flex-start" : "stretch"}
                sx={{ minWidth: 0 }}
              >
                <Box flex={1} minWidth={0} maxWidth="100%" overflow="hidden">
                  {isSummaryLoading || isDailyLoading ? (
                    <Box
                      height={140}
                      borderRadius={1}
                      sx={{ bgcolor: theme.palette.action.hover }}
                    />
                  ) : dailyError || summaryError ? (
                    <QueryState
                      isLoading={false}
                      error={dailyError || summaryError}
                      onRetry={() => {
                        refetchDaily();
                        refetchSummary();
                      }}
                    />
                  ) : (
                    <ContributionHeatmap
                      data={dailyData}
                      startDate={range.startDate}
                      endDate={range.endDate}
                    />
                  )}
                </Box>

                <Box
                  display="flex"
                  flexDirection={isMd ? "column" : "row"}
                  flexWrap="wrap"
                  gap={0.5}
                  sx={{
                    flexShrink: 0,
                    maxHeight: isMd ? 160 : undefined,
                    overflowY: isMd ? "auto" : "visible",
                  }}
                >
                  {yearOptions.map((opt) => {
                    const selected = opt.key === range.key;
                    return (
                      <Button
                        key={opt.key}
                        size="small"
                        variant={selected ? "contained" : "text"}
                        color={selected ? "secondary" : "inherit"}
                        onClick={() => setSelectedKey(opt.key)}
                        sx={{
                          minWidth: isMd ? 88 : 0,
                          justifyContent: isMd ? "flex-start" : "center",
                          px: 1,
                          py: 0.25,
                          fontSize: 12,
                          fontWeight: selected ? 700 : 500,
                        }}
                      >
                        {opt.label}
                      </Button>
                    );
                  })}
                </Box>
              </Box>
            </CardContent>
          </DashCard>

          <DashCard
            sx={{ minHeight: 320, minWidth: 0, maxWidth: "100%", overflow: "hidden" }}
          >
            <CardContent sx={{ height: "100%", minWidth: 0, overflow: "hidden" }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                <Tag
                  sx={{
                    fontSize: 18,
                    verticalAlign: "text-bottom",
                    mr: 0.5,
                    color: theme.palette.secondary[400],
                  }}
                />
                Top channels
              </Typography>
              <Box height={260} sx={{ minWidth: 0, overflowX: "auto" }}>
                <MemberChannelsChart
                  data={channels}
                  isLoading={isChannelsLoading}
                  error={channelsError}
                  onRetry={refetchChannels}
                />
              </Box>
            </CardContent>
          </DashCard>
        </Box>
      </Box>
    </Box>
  );
};

export default MemberProfile;
