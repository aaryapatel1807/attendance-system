import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { http, apiErrorMessage } from "../../api/http";
import type { AttendanceRecordPayload, HistoryRow, RecognizeResponse } from "../../types";

interface AttendanceState {
  history: HistoryRow[];
  historyStatus: "idle" | "loading" | "succeeded" | "failed";
  recognizeStatus: "idle" | "scanning" | "succeeded" | "failed";
  recognizeError: string | null;
  saving: boolean;
  lastSaved: number | null;
}

const initialState: AttendanceState = {
  history: [],
  historyStatus: "idle",
  recognizeStatus: "idle",
  recognizeError: null,
  saving: false,
  lastSaved: null,
};

export const recognizeImage = createAsyncThunk(
  "attendance/recognize",
  async (image: string, { rejectWithValue }) => {
    try {
      const res = await http.post<RecognizeResponse>("/face/recognize", { image });
      return res.data;
    } catch (e) {
      return rejectWithValue(apiErrorMessage(e));
    }
  }
);

export const registerFace = createAsyncThunk(
  "attendance/registerFace",
  async ({ studentId, images }: { studentId: string; images: string[] }, { rejectWithValue }) => {
    try {
      const res = await http.post<{ success: boolean; faces_found: number; embedding_dim: number }>(
        "/face/register",
        { studentId, images }
      );
      return res.data;
    } catch (e) {
      return rejectWithValue(apiErrorMessage(e));
    }
  }
);

export const saveAttendance = createAsyncThunk(
  "attendance/save",
  async (payload: AttendanceRecordPayload, { rejectWithValue }) => {
    try {
      const res = await http.post<{ saved: number }>("/attendance", payload);
      return res.data.saved;
    } catch (e) {
      return rejectWithValue(apiErrorMessage(e));
    }
  }
);

export const fetchHistory = createAsyncThunk(
  "attendance/history",
  async (classId: string | undefined, { rejectWithValue }) => {
    try {
      const res = await http.get<{ history: HistoryRow[] }>("/attendance/history", {
        params: classId ? { classId } : undefined,
      });
      return res.data.history;
    } catch (e) {
      return rejectWithValue(apiErrorMessage(e));
    }
  }
);

const attendanceSlice = createSlice({
  name: "attendance",
  initialState,
  reducers: {
    resetRecognize(state) {
      state.recognizeStatus = "idle";
      state.recognizeError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(recognizeImage.pending, (s) => {
        s.recognizeStatus = "scanning";
        s.recognizeError = null;
      })
      .addCase(recognizeImage.fulfilled, (s) => {
        s.recognizeStatus = "succeeded";
      })
      .addCase(recognizeImage.rejected, (s, a) => {
        s.recognizeStatus = "failed";
        s.recognizeError = (a.payload as string) ?? "Recognition failed";
      })
      .addCase(saveAttendance.pending, (s) => {
        s.saving = true;
      })
      .addCase(saveAttendance.fulfilled, (s, a) => {
        s.saving = false;
        s.lastSaved = a.payload;
      })
      .addCase(saveAttendance.rejected, (s) => {
        s.saving = false;
      })
      .addCase(fetchHistory.pending, (s) => {
        s.historyStatus = "loading";
      })
      .addCase(fetchHistory.fulfilled, (s, a) => {
        s.historyStatus = "succeeded";
        s.history = a.payload;
      })
      .addCase(fetchHistory.rejected, (s) => {
        s.historyStatus = "failed";
      });
  },
});

export const { resetRecognize } = attendanceSlice.actions;
export default attendanceSlice.reducer;
