import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const api = createApi({
    // baseQuery: fetchBaseQuery({ baseUrl: process.env.REACT_APP_BASE_URL }),
    baseQuery: fetchBaseQuery({ baseUrl: "http://localhost:5001" }),
    reducerPath: "adminApi",
    tagTypes: ["Score","Firsts","Member","Members"],
    endpoints: (build) => ({
        getFirsts: build.query({
            query: (limit) => `client/firsts/${limit}`,
            providesTags: ["Firsts"],
        }),
        getScore: build.query({
            query: () => "client/score",
            providesTags:  ["Score"]
        }),
        getMember: build.query({
            query: (id) => `members/member/${id}`,
            providesTags: ["Member"],
        }),
        getMembers: build.query({
            query: () => "members/members",
            providesTags: ["Members"],
        }),
    })
})

export const { useGetFirstsQuery, useGetScoreQuery, useGetMemberQuery, useGetMembersQuery } = api