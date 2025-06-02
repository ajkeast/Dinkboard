import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const api = createApi({
    baseQuery: fetchBaseQuery({ baseUrl: process.env.REACT_APP_BASE_URL }),
    reducerPath: "adminApi",
    tagTypes: ["Firsts","Members","Emojis","Messages","AI"],
    endpoints: (build) => ({

        // FIRSTS
        getFirsts: build.query({
            query: (limit) => `api/firsts/limit/${limit}`,
            providesTags: ["Firsts"],
        }),
        getScore: build.query({
            query: () => "api/firsts/score",
            providesTags:  ["Firsts"]
        }),
        getCumCount: build.query({
            query: () => "api/firsts/cumcount",
            providesTags:  ["Firsts"]
        }),
        getJuice: build.query({
            query: () => "api/firsts/juice",
            providesTags:  ["Firsts"]
        }),
        getJuiceByMember: build.query({
            query: () => "api/firsts/juice/members",
            providesTags:  ["Firsts"]
        }),

        // MEMBERS
        getMember: build.query({
            query: (id) => `api/members/${id}`,
            providesTags: ["Members"],
        }),
        getMembers: build.query({
            query: () => "api/members",
            providesTags: ["Members"],
        }),

        // EMOJIS
        getEmoji: build.query({
            query: (id) => `api/emojis/${id}`,
            providesTags: ["Emojis"],
        }),
        getEmojis: build.query({
            query: () => "api/emojis",
            providesTags: ["Emojis"],
        }),
        getEmojisCount: build.query({
            query: () => "api/emojis/count",
            providesTags: ["Emojis"],
        }),

        // MESSAGES
        getMessage: build.query({
            query: (id) => `api/messages/${id}`,
            providesTags: ["Messages"],
        }),
        getMessages: build.query({
            query: () => "api/messages",
            providesTags: ["Messages"],
        }),
        getMessagesByMembers: build.query({
            query: () => "api/messages/members",
            providesTags: ["Messages"],
        }),
        getMessagesByChannel: build.query({
            query: () => "api/messages/channels",
            providesTags: ["Messages"],
        }),
        getMessagesByMonth: build.query({
            query: () => ({
                url: "api/messages/month",
                method: 'GET',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            }),
            providesTags: ["Messages"],
        }),       
        getMessagesByMonthByMember: build.query({
            query: () => "api/messages/month/member",
            providesTags: ["Messages"],
        }),
        getMessagesStats: build.query({
            query: () => "api/messages/stats",
            providesTags: ["Messages"],
        }),

        // AI ENDPOINTS
        // ChatGPT
        getChatGPTUserStats: build.query({
            query: ({ startDate, endDate } = {}) => ({
                url: "api/ai/chatgpt/users",
                params: { startDate, endDate }
            }),
            providesTags: ["AI"],
        }),
        getChatGPTModelStats: build.query({
            query: () => "api/ai/chatgpt/models",
            providesTags: ["AI"],
        }),
        getChatGPTTimeline: build.query({
            query: (groupBy = 'day') => ({
                url: "api/ai/chatgpt/timeline",
                params: { groupBy }
            }),
            providesTags: ["AI"],
        }),
        getRecentChatGPT: build.query({
            query: (limit = 50) => ({
                url: "api/ai/chatgpt/recent",
                params: { limit }
            }),
            providesTags: ["AI"],
        }),

        // DALL-E
        getDalleUserStats: build.query({
            query: ({ startDate, endDate } = {}) => ({
                url: "api/ai/dalle/users",
                params: { startDate, endDate }
            }),
            providesTags: ["AI"],
        }),
        getDalleTimeline: build.query({
            query: (groupBy = 'day') => ({
                url: "api/ai/dalle/timeline",
                params: { groupBy }
            }),
            providesTags: ["AI"],
        }),
        getRecentDalle: build.query({
            query: (limit = 50) => ({
                url: "api/ai/dalle/recent",
                params: { limit }
            }),
            providesTags: ["AI"],
        }),

        // Combined Stats
        getAIStats: build.query({
            query: () => "api/ai/stats",
            providesTags: ["AI"],
        }),
    })
})

export const { 
    useGetFirstsQuery, 
    useGetScoreQuery, 
    useGetCumCountQuery,
    useGetJuiceQuery,
    useGetJuiceByMemberQuery, 
    useGetMemberQuery, 
    useGetMembersQuery,
    useGetEmojiQuery,
    useGetEmojisQuery,
    useGetEmojisCountQuery,
    useGetMessageQuery,
    useGetMessagesQuery,
    useGetMessagesByMembersQuery,
    useGetMessagesByChannelQuery,
    useGetMessagesByMonthQuery,
    useGetMessagesByMonthByMemberQuery,
    useGetMessagesStatsQuery,

    // AI Exports
    useGetChatGPTUserStatsQuery,
    useGetChatGPTModelStatsQuery,
    useGetChatGPTTimelineQuery,
    useGetRecentChatGPTQuery,
    useGetDalleUserStatsQuery,
    useGetDalleTimelineQuery,
    useGetRecentDalleQuery,
    useGetAIStatsQuery,
} = api