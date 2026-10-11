import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { http, apiErrorMessage } from "../../api/http";
import type { DashboardStats } from "../../types";

interface DashboardState {
  stats: DashboardStats | null;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

const initialState: DashboardState = {
  stats: null,
  status: "idle",
  error: null,
};

export const fetchStats = createAsyncThunk(
  "dashboard/stats",
  async (classId: string | undefined, { rejectWithValue }) => {
    try {
      const res = await http.get<DashboardStats>("/dashboard/stats", {
        params: classId ? { classId } : undefined,
      });
      return res.data;
    } catch (e) {
      return rejectWithValue(apiErrorMessage(e));
    }
  }
);

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchStats.pending, (s) => {
        s.status = "loading";
        s.error = null;
      })
      .addCase(fetchStats.fulfilled, (s, a) => {
        s.status = "succeeded";
        s.stats = a.payload;
      })
      .addCase(fetchStats.rejected, (s, a) => {
        s.status = "failed";
        s.error = (a.payload as string) ?? "Failed to load dashboard";
      });
  },
});

export default dashboardSlice.reducer;
