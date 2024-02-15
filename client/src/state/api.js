import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const api = createApi({
    baseQuery: fetchBaseQuery({ baseUrl: process.env.REACT_APP_BASE_URL }),
    reducerPath: "adminApi",
    tagTypes: ["Firsts","Members","Emojis","Messages"],
    endpoints: (build) => ({

        // FIRSTS
        getFirsts: build.query({
            query: (limit) => `client/firsts/${limit}`,
            providesTags: ["Firsts"],
        }),
        getScore: build.query({
            query: () => "client/score",
            providesTags:  ["Firsts"]
        }),
        getCumCount: build.query({
            query: () => "client/cumcount",
            providesTags:  ["Firsts"]
        }),

        // MEMBERS
        getMember: build.query({
            query: (id) => `client/member/${id}`,
            providesTags: ["Members"],
        }),
        getMembers: build.query({
            query: () => "client/members",
            providesTags: ["Members"],
        }),

        // EMOJIS
        getEmoji: build.query({
            query: (id) => `client/emoji/${id}`,
            providesTags: ["Emojis"],
        }),
        getEmojis: build.query({
            query: () => "client/emojis",
            providesTags: ["Emojis"],
        }),
        getEmojisCount: build.query({
            query: () => "client/emojis/count",
            providesTags: ["Emojis"],
        }),

        // MESSAGES
        getMessage: build.query({
            query: (id) => `client/message/${id}`,
            providesTags: ["Members"],
        }),
        getMessages: build.query({
            query: () => "client/messages",
            providesTags: ["Members"],
        }),
    })
})

export const { 
    useGetFirstsQuery, 
    useGetScoreQuery, 
    useGetCumCountQuery, 
    useGetMemberQuery, 
    useGetMembersQuery,
    useGetEmojiQuery,
    useGetEmojisQuery,
    useGetEmojisCountQuery,
    useGetMessageQuery,
    useGetMessagesQuery
} = api