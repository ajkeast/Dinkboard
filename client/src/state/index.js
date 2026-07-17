import { createSlice } from "@reduxjs/toolkit";

const MODE_KEY = "dinkboard.mode";

const readStoredMode = () => {
  try {
    const stored = localStorage.getItem(MODE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // ignore
  }
  return "dark";
};

const initialState = {
  mode: readStoredMode(),
};

export const globalSlice = createSlice({
  name: "global",
  initialState,
  reducers: {
    setMode: (state) => {
      state.mode = state.mode === "light" ? "dark" : "light";
      try {
        localStorage.setItem(MODE_KEY, state.mode);
      } catch {
        // ignore
      }
    },
    setModeExplicit: (state, action) => {
      const next = action.payload === "light" ? "light" : "dark";
      state.mode = next;
      try {
        localStorage.setItem(MODE_KEY, next);
      } catch {
        // ignore
      }
    },
  },
});

export const { setMode, setModeExplicit } = globalSlice.actions;

export default globalSlice.reducer;
