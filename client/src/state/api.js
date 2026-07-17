import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { loggedOut, setCredentials } from "./authSlice";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/",
  credentials: "include",
});

const isAuthEndpoint = (args) => {
  const url = typeof args === "string" ? args : args?.url;
  return typeof url === "string" && url.includes("api/auth/");
};

const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status === 401 && !isAuthEndpoint(args)) {
    const refreshResult = await rawBaseQuery(
      { url: "api/auth/refresh", method: "POST" },
      api,
      extraOptions
    );

    if (refreshResult.data?.user) {
      api.dispatch(setCredentials(refreshResult.data.user));
      result = await rawBaseQuery(args, api, extraOptions);
    } else {
      api.dispatch(loggedOut());
    }
  }

  return result;
};

/** Pull human-readable message from API error envelope */
export const getApiErrorMessage = (error, fallback = "Something went wrong") =>
  error?.data?.error?.message || error?.error || fallback;

export const api = createApi({
  baseQuery: baseQueryWithReauth,
  reducerPath: "adminApi",
  tagTypes: ["Firsts", "Members", "Emojis", "Messages", "AI", "Auth"],
  endpoints: (build) => ({
    // AUTH
    login: build.mutation({
      query: (body) => ({
        url: "api/auth/login",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Auth", "Firsts", "Members", "Emojis", "Messages", "AI"],
    }),
    register: build.mutation({
      query: (body) => ({
        url: "api/auth/register",
        method: "POST",
        body,
      }),
    }),
    logout: build.mutation({
      query: () => ({
        url: "api/auth/logout",
        method: "POST",
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
        } finally {
          dispatch(loggedOut());
          dispatch(api.util.resetApiState());
        }
      },
    }),
    me: build.query({
      query: () => "api/auth/me",
      providesTags: ["Auth"],
    }),
    refresh: build.mutation({
      query: () => ({
        url: "api/auth/refresh",
        method: "POST",
      }),
    }),

    // FIRSTS
    getFirsts: build.query({
      query: (limit) => `api/firsts/limit/${limit}`,
      providesTags: ["Firsts"],
    }),
    getScore: build.query({
      query: () => "api/firsts/score",
      providesTags: ["Firsts"],
    }),
    getCumCount: build.query({
      query: () => "api/firsts/cumcount",
      providesTags: ["Firsts"],
    }),
    getJuice: build.query({
      query: () => "api/firsts/juice",
      providesTags: ["Firsts"],
    }),
    getJuiceByMember: build.query({
      query: () => "api/firsts/juice/members",
      providesTags: ["Firsts"],
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
        method: "GET",
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
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

    // AI
    getChatGPTUserStats: build.query({
      query: ({ startDate, endDate } = {}) => ({
        url: "api/ai/chatgpt/users",
        params: { startDate, endDate },
      }),
      providesTags: ["AI"],
    }),
    getChatGPTModelStats: build.query({
      query: () => "api/ai/chatgpt/models",
      providesTags: ["AI"],
    }),
    getChatGPTTimeline: build.query({
      query: (groupBy = "day") => ({
        url: "api/ai/chatgpt/timeline",
        params: { groupBy },
      }),
      providesTags: ["AI"],
    }),
    getRecentChatGPT: build.query({
      query: (limit = 50) => ({
        url: "api/ai/chatgpt/recent",
        params: { limit },
      }),
      providesTags: ["AI"],
    }),
    getDalleUserStats: build.query({
      query: ({ startDate, endDate } = {}) => ({
        url: "api/ai/dalle/users",
        params: { startDate, endDate },
      }),
      providesTags: ["AI"],
    }),
    getDalleTimeline: build.query({
      query: (groupBy = "day") => ({
        url: "api/ai/dalle/timeline",
        params: { groupBy },
      }),
      providesTags: ["AI"],
    }),
    getRecentDalle: build.query({
      query: (limit = 50) => ({
        url: "api/ai/dalle/recent",
        params: { limit },
      }),
      providesTags: ["AI"],
    }),
    getAIStats: build.query({
      query: () => "api/ai/stats",
      providesTags: ["AI"],
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useMeQuery,
  useLazyMeQuery,
  useRefreshMutation,
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
  useGetChatGPTUserStatsQuery,
  useGetChatGPTModelStatsQuery,
  useGetChatGPTTimelineQuery,
  useGetRecentChatGPTQuery,
  useGetDalleUserStatsQuery,
  useGetDalleTimelineQuery,
  useGetRecentDalleQuery,
  useGetAIStatsQuery,
} = api;
