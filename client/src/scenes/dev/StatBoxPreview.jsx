import React from "react";
import {
  Box,
  CardContent,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  CalendarMonthRounded,
  CalendarTodayRounded,
  SmartToy,
  Image,
  Token,
  MessageRounded,
} from "@mui/icons-material";
import Header from "components/Header";
import DashCard from "components/DashCard";
import StatBox from "components/StatBox";
import StatStrip from "components/StatStrip";
import {
  useGetMessagesStatsQuery,
  useGetAIStatsQuery,
} from "state/api";

const sampleYear = [{ thisYTD: 5800, lastYTD: 6800 }];
const sampleMonth = [{ thisMTD: 410, lastMTD: 540 }];

const Section = ({ title, subtitle, children }) => (
  <Box mb={4}>
    <Typography variant="h5" fontWeight={700} gutterBottom>
      {title}
    </Typography>
    {subtitle && (
      <Typography variant="body2" color="text.secondary" mb={1.5}>
        {subtitle}
      </Typography>
    )}
    {children}
  </Box>
);

const MockChart = () => {
  const theme = useTheme();
  return (
    <Box
      height={160}
      width="100%"
      borderRadius={1}
      sx={{
        background: `linear-gradient(180deg, ${
          theme.palette.mode === "dark"
            ? "rgba(105,79,206,0.25)"
            : "rgba(105,79,206,0.12)"
        } 0%, transparent 70%)`,
        border: `1px dashed ${theme.palette.divider}`,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        pb: 1,
      }}
    >
      <Typography variant="caption" color="text.secondary">
        Messages chart placeholder
      </Typography>
    </Box>
  );
};

const DashboardMock = ({ variant }) => {
  const isXl = useMediaQuery("(min-width: 1100px)");
  const spanSide = isXl ? "span 2" : "span 12";
  const spanChart = isXl ? "span 8" : "span 12";

  if (variant === "strip") {
    return (
      <Box display="flex" flexDirection="column" gap={1.5}>
        <StatStrip
          items={[
            {
              title: "Yearly",
              time: "year",
              icon: <CalendarMonthRounded />,
              description: "Since last year",
              data: sampleYear,
            },
            {
              title: "Monthly",
              time: "month",
              icon: <CalendarTodayRounded />,
              description: "Since last month",
              data: sampleMonth,
            },
          ]}
        />
        <DashCard>
          <CardContent>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              <MessageRounded
                fontSize="small"
                sx={{ verticalAlign: "middle", mr: 0.5 }}
              />{" "}
              Messages
            </Typography>
            <MockChart />
          </CardContent>
        </DashCard>
      </Box>
    );
  }

  return (
    <Box
      display="grid"
      gridTemplateColumns="repeat(12, minmax(0, 1fr))"
      gap={1.5}
    >
      <DashCard sx={{ gridColumn: spanChart, gridRow: isXl ? "span 2" : "span 1" }}>
        <CardContent>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            <MessageRounded
              fontSize="small"
              sx={{ verticalAlign: "middle", mr: 0.5 }}
            />{" "}
            Messages
          </Typography>
          <MockChart />
        </CardContent>
      </DashCard>
      <StatBox
        variant={variant}
        title="Yearly"
        time="year"
        icon={<CalendarMonthRounded fontSize="small" />}
        description="Since last year"
        data={sampleYear}
        sx={{ gridColumn: spanSide, gridRow: "span 1" }}
      />
      <StatBox
        variant={variant}
        title="Monthly"
        time="month"
        icon={<CalendarTodayRounded fontSize="small" />}
        description="Since last month"
        data={sampleMonth}
        sx={{ gridColumn: spanSide, gridRow: "span 1" }}
      />
    </Box>
  );
};

const AIMock = ({ variant, chatgptData, dalleData, tokenData, loading }) => {
  const isXl = useMediaQuery("(min-width: 1200px)");
  const isMd = useMediaQuery("(min-width: 750px)");
  const span = (cols) => {
    if (isXl) return `span ${cols}`;
    if (isMd) return "span 4";
    return "span 12";
  };

  const iconSx = { fontSize: 20 };

  if (variant === "strip") {
    return (
      <StatStrip
        items={[
          {
            title: "LLM Prompts",
            time: "month",
            icon: <SmartToy />,
            description: "vs. prior 30 days",
            data: chatgptData,
            isLoading: loading,
          },
          {
            title: "Images",
            time: "month",
            icon: <Image />,
            description: "vs. prior 30 days",
            data: dalleData,
            isLoading: loading,
          },
          {
            title: "Total Tokens",
            time: "month",
            icon: <Token />,
            description: "vs. prior 30 days",
            data: tokenData,
            isLoading: loading,
          },
        ]}
      />
    );
  }

  return (
    <Box
      display="grid"
      gridTemplateColumns="repeat(12, minmax(0, 1fr))"
      gap={1.5}
    >
      <StatBox
        variant={variant}
        title="LLM Prompts"
        time="month"
        description="vs. prior 30 days"
        data={chatgptData}
        isLoading={loading}
        icon={<SmartToy sx={iconSx} />}
        sx={{ gridColumn: span(4) }}
      />
      <StatBox
        variant={variant}
        title="Images"
        time="month"
        description="vs. prior 30 days"
        data={dalleData}
        isLoading={loading}
        icon={<Image sx={iconSx} />}
        sx={{ gridColumn: span(4) }}
      />
      <StatBox
        variant={variant}
        title="Total Tokens"
        time="month"
        description="vs. prior 30 days"
        data={tokenData}
        isLoading={loading}
        icon={<Token sx={iconSx} />}
        sx={{ gridColumn: span(4) }}
      />
    </Box>
  );
};

const LiveDashboardStrip = ({ data, isLoading, error }) => (
  <StatStrip
    items={[
      {
        title: "Yearly",
        time: "year",
        icon: <CalendarMonthRounded />,
        description: "Since last year",
        data,
        isLoading,
        error,
      },
      {
        title: "Monthly",
        time: "month",
        icon: <CalendarTodayRounded />,
        description: "Since last month",
        data,
        isLoading,
        error,
      },
    ]}
  />
);

const StatBoxPreview = () => {
  const {
    data: messagesStats,
    isLoading: messagesLoading,
    error: messagesError,
  } = useGetMessagesStatsQuery();
  const {
    data: aiStats,
    isLoading: aiLoading,
  } = useGetAIStatsQuery();

  const chatgptData = aiStats
    ? [
        {
          thisMTD: aiStats.chatgpt_last_30_days || 0,
          lastMTD: aiStats.chatgpt_prev_30_days || 0,
        },
      ]
    : sampleMonth;
  const dalleData = aiStats
    ? [
        {
          thisMTD: aiStats.dalle_last_30_days || 0,
          lastMTD: aiStats.dalle_prev_30_days || 0,
        },
      ]
    : sampleMonth;
  const tokenData = aiStats
    ? [
        {
          thisMTD: Number(aiStats.total_tokens_last_30_days) || 0,
          lastMTD: Number(aiStats.total_tokens_prev_30_days) || 0,
        },
      ]
    : [{ thisMTD: 1200000, lastMTD: 900000 }];

  return (
    <Box pb={4}>
      <Header
        title="Stat box previews"
        subtitle="Compare variants — pick one for Dashboard + AI Usage. URL: #/dev/stat-boxes"
      />

      <Section
        title="1. Current (default)"
        subtitle="Existing StatBox — sparse on desktop."
      >
        <Typography variant="overline" color="text.secondary">
          Dashboard-like
        </Typography>
        <Box mb={2}>
          <DashboardMock variant="default" />
        </Box>
        <Typography variant="overline" color="text.secondary">
          AI-like
        </Typography>
        <AIMock
          variant="default"
          chatgptData={chatgptData}
          dalleData={dalleData}
          tokenData={tokenData}
          loading={aiLoading && !aiStats}
        />
      </Section>

      <Section
        title="2. Compact"
        subtitle="Tighter padding; value + trend on one row."
      >
        <Typography variant="overline" color="text.secondary">
          Dashboard-like
        </Typography>
        <Box mb={2}>
          <DashboardMock variant="compact" />
        </Box>
        <Typography variant="overline" color="text.secondary">
          AI-like
        </Typography>
        <AIMock
          variant="compact"
          chatgptData={chatgptData}
          dalleData={dalleData}
          tokenData={tokenData}
          loading={aiLoading && !aiStats}
        />
      </Section>

      <Section
        title="3. Inline"
        subtitle="Single horizontal KPI row per card."
      >
        <Typography variant="overline" color="text.secondary">
          Dashboard-like
        </Typography>
        <Box mb={2}>
          <DashboardMock variant="inline" />
        </Box>
        <Typography variant="overline" color="text.secondary">
          AI-like
        </Typography>
        <AIMock
          variant="inline"
          chatgptData={chatgptData}
          dalleData={dalleData}
          tokenData={tokenData}
          loading={aiLoading && !aiStats}
        />
      </Section>

      <Section
        title="4. Strip"
        subtitle="One shared card with dividers between metrics."
      >
        <Typography variant="overline" color="text.secondary">
          Dashboard-like
        </Typography>
        <Box mb={2}>
          <DashboardMock variant="strip" />
        </Box>
        <Typography variant="overline" color="text.secondary">
          AI-like
        </Typography>
        <AIMock
          variant="strip"
          chatgptData={chatgptData}
          dalleData={dalleData}
          tokenData={tokenData}
          loading={aiLoading && !aiStats}
        />
      </Section>

      <Section
        title="Live data (strip)"
        subtitle="Yearly / Monthly from messages stats API."
      >
        <LiveDashboardStrip
          data={messagesStats}
          isLoading={messagesLoading}
          error={messagesError}
        />
      </Section>
    </Box>
  );
};

export default StatBoxPreview;
