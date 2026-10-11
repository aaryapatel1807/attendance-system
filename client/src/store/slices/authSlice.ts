import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { http, TOKEN_KEY, apiErrorMessage } from "../../api/http";
import type { User } from "../../types";

interface AuthState {
  user: User | null;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  initialized: boolean;
}

const initialState: AuthState = {
  user: null,
  status: "idle",
  error: null,
  initialized: false,
};

export const login = createAsyncThunk(
  "auth/login",
  async (creds: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const res = await http.post<{ token: string; user: User }>("/auth/login", creds);
      localStorage.setItem(TOKEN_KEY, res.data.token);
      return res.data.user;
    } catch (e) {
      return rejectWithValue(apiErrorMessage(e));
    }
  }
);

export const fetchMe = createAsyncThunk("auth/me", async (_, { rejectWithValue }) => {
  try {
    const res = await http.get<{ user: User }>("/auth/me");
    return res.data.user;
  } catch (e) {
    return rejectWithValue(apiErrorMessage(e));
  }
});

export const logoutUser = createAsyncThunk("auth/logout", async () => {
  try {
    await http.post("/auth/logout");
  } catch {
    /* best-effort */
  }
  localStorage.removeItem(TOKEN_KEY);
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (s) => {
        s.status = "loading";
        s.error = null;
      })
      .addCase(login.fulfilled, (s, a) => {
        s.status = "succeeded";
        s.user = a.payload;
        s.initialized = true;
      })
      .addCase(login.rejected, (s, a) => {
        s.status = "failed";
        s.error = (a.payload as string) ?? "Login failed";
        s.initialized = true;
      })
      .addCase(fetchMe.pending, (s) => {
        s.status = "loading";
      })
      .addCase(fetchMe.fulfilled, (s, a) => {
        s.status = "succeeded";
        s.user = a.payload;
        s.initialized = true;
      })
      .addCase(fetchMe.rejected, (s) => {
        s.status = "failed";
        s.user = null;
        s.initialized = true;
        localStorage.removeItem(TOKEN_KEY);
      })
      .addCase(logoutUser.fulfilled, (s) => {
        s.user = null;
        s.status = "idle";
        s.error = null;
      });
  },
});

export default authSlice.reducer;
