import React from "react";
import { Box, useTheme, Typography, useMediaQuery } from "@mui/material";
import { 
    useGetAIStatsQuery,
    useGetChatGPTTimelineQuery,
    useGetDalleTimelineQuery,
    useGetChatGPTUserStatsQuery,
    useGetDalleUserStatsQuery,
    useGetChatGPTModelStatsQuery,
    useGetRecentChatGPTQuery,
    useGetRecentDalleQuery
} from "state/api";
import { 
    SmartToy, 
    Image, 
    Token
} from "@mui/icons-material";
import StatBox from "components/StatBox";
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    Legend
} from "recharts";
import FlexBetween from "components/FlexBetween";

const AI = () => {
    const theme = useTheme();
    const isNonMediumScreens = useMediaQuery("(min-width: 1200px)");

    // Fetch all the data
    const { data: aiStats, isLoading: statsLoading } = useGetAIStatsQuery();
    const { data: chatgptTimeline, isLoading: timelineLoading } = useGetChatGPTTimelineQuery();
    const { data: dalleTimeline } = useGetDalleTimelineQuery();
    const { data: chatgptUsers } = useGetChatGPTUserStatsQuery();
    const { data: dalleUsers } = useGetDalleUserStatsQuery();
    const { data: modelStats } = useGetChatGPTModelStatsQuery();

    // Colors for charts
    const COLORS = [
        theme.palette.secondary[500],
        theme.palette.secondary[300],
        theme.palette.secondary[300],
        theme.palette.secondary[200],
    ];

    // Prepare data for StatBoxes
    const chatgptData = aiStats ? [{
        thisMTD: aiStats.chatgpt_today || 0,
        lastMTD: (aiStats.chatgpt_last_30_days || 0) / 30
    }] : [];

    const dalleData = aiStats ? [{
        thisMTD: aiStats.dalle_today || 0,
        lastMTD: (aiStats.dalle_last_30_days || 0) / 30
    }] : [];

    const tokenData = aiStats ? [{
        thisMTD: aiStats.total_tokens_last_30_days || 0,
        lastMTD: aiStats.total_tokens_last_30_days || 0
    }] : [];

    return (
        <Box m="1.5rem 2.5rem">
            <FlexBetween>
                <Typography variant="h4" mb="0.5rem">
                    AI USAGE DASHBOARD
                </Typography>
            </FlexBetween>

            <Box
                mt="20px"
                display="grid"
                gridTemplateColumns="repeat(12, 1fr)"
                gridAutoRows="160px"
                gap="20px"
                sx={{
                    "& > div": { gridColumn: isNonMediumScreens ? undefined : "span 12" }
                }}
            >
                {/* STAT BOXES */}
                <Box gridColumn="span 2">
                    <StatBox
                        title="ChatGPT Calls"
                        value={aiStats?.chatgpt_today || 0}
                        description="vs. last 30 days"
                        data={chatgptData}
                        icon={<SmartToy sx={{ color: theme.palette.secondary[300], fontSize: "26px" }} />}
                        isLoading={statsLoading}
                        time="month"
                    />
                </Box>

                <Box gridColumn="span 2">
                    <StatBox
                        title="DALL-E Prompts"
                        value={aiStats?.dalle_today || 0}
                        description="vs. last 30 days"
                        data={dalleData}
                        icon={<Image sx={{ color: theme.palette.secondary[300], fontSize: "26px" }} />}
                        isLoading={statsLoading}
                        time="month"
                    />
                </Box>

                <Box gridColumn="span 2">
                    <StatBox
                        title="Total Tokens"
                        value={aiStats?.total_tokens_last_30_days || 0}
                        description="Last 30 Days"
                        data={tokenData}
                        icon={<Token sx={{ color: theme.palette.secondary[300], fontSize: "26px" }} />}
                        isLoading={statsLoading}
                        time="month"
                    />
                </Box>

                {/* TIMELINE CHARTS */}
                <Box
                    gridColumn="span 8"
                    gridRow="span 2"
                    backgroundColor={theme.palette.background.alt}
                    p="1rem"
                    borderRadius="0.55rem"
                >
                    <Typography variant="h6" sx={{ color: theme.palette.secondary[100] }}>
                        AI Usage Timeline
                    </Typography>
                    <ResponsiveContainer width="100%" height="100%">
                        {timelineLoading ? (
                            <Typography>Loading...</Typography>
                        ) : (
                            <AreaChart
                                data={chatgptTimeline}
                                margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                            >
                                <defs>
                                    <linearGradient id="colorChatGPT" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={theme.palette.primary[300]} stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor={theme.palette.primary[300]} stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="time_period" />
                                <YAxis />
                                <CartesianGrid strokeDasharray="3 3" />
                                <Tooltip />
                                <Area 
                                    type="monotone" 
                                    dataKey="total_calls" 
                                    stroke={theme.palette.primary[300]}
                                    fillOpacity={1}
                                    fill="url(#colorChatGPT)"
                                    name="ChatGPT Calls"
                                />
                            </AreaChart>
                        )}
                    </ResponsiveContainer>
                </Box>

                {/* MODEL DISTRIBUTION */}
                <Box
                    gridColumn="span 4"
                    gridRow="span 2"
                    backgroundColor={theme.palette.background.alt}
                    p="1.5rem"
                    borderRadius="0.55rem"
                >
                    <Typography variant="h6" sx={{ color: theme.palette.secondary[100] }}>
                        Model Distribution
                    </Typography>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={modelStats || []}
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="total_calls"
                                nameKey="model"
                            >
                                {(modelStats || []).map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </Box>

                {/* USER STATISTICS */}
                <Box
                    gridColumn="span 6"
                    gridRow="span 2"
                    backgroundColor={theme.palette.background.alt}
                    p="1.5rem"
                    borderRadius="0.55rem"
                >
                    <Typography variant="h6" sx={{ color: theme.palette.secondary[100] }}>
                        Top ChatGPT Users
                    </Typography>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={(chatgptUsers || []).slice(0, 5)}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="display_name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="total_calls" fill={theme.palette.primary[300]} name="Total Calls" />
                        </BarChart>
                    </ResponsiveContainer>
                </Box>

                {/* DALLE USER STATISTICS */}
                <Box
                    gridColumn="span 6"
                    gridRow="span 2"
                    backgroundColor={theme.palette.background.alt}
                    p="1.5rem"
                    borderRadius="0.55rem"
                >
                    <Typography variant="h6" sx={{ color: theme.palette.secondary[100] }}>
                        Top DALL-E Users
                    </Typography>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={(dalleUsers || []).slice(0, 5)}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="display_name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="total_prompts" fill={theme.palette.secondary[300]} name="Total Prompts" />
                        </BarChart>
                    </ResponsiveContainer>
                </Box>
            </Box>
        </Box>
    );
};

export default AI;
