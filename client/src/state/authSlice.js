import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  user: null,
  status: "idle", // idle | loading | authenticated | anonymous
};

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      state.user = action.payload;
      state.status = "authenticated";
    },
    loggedOut: (state) => {
      state.user = null;
      state.status = "anonymous";
    },
    setAuthLoading: (state) => {
      state.status = "loading";
    },
  },
});

export const { setCredentials, loggedOut, setAuthLoading } = authSlice.actions;
export const selectCurrentUser = (state) => state.auth.user;
export const selectAuthStatus = (state) => state.auth.status;
export const selectIsAuthenticated = (state) =>
  state.auth.status === "authenticated";

export default authSlice.reducer;
