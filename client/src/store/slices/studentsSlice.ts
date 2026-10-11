import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { http, apiErrorMessage } from "../../api/http";
import type { Paginated, Student, StudentDetail } from "../../types";

export interface StudentFilters {
  search?: string;
  department?: string;
  semester?: string;
  page?: number;
  limit?: number;
}

interface StudentsState {
  items: Student[];
  total: number;
  page: number;
  pages: number;
  detail: StudentDetail | null;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  mutating: boolean;
}

const initialState: StudentsState = {
  items: [],
  total: 0,
  page: 1,
  pages: 1,
  detail: null,
  status: "idle",
  error: null,
  mutating: false,
};

export const fetchStudents = createAsyncThunk(
  "students/list",
  async (filters: StudentFilters | undefined, { rejectWithValue }) => {
    try {
      const res = await http.get<Paginated<Student>>("/students", { params: filters });
      return res.data;
    } catch (e) {
      return rejectWithValue(apiErrorMessage(e));
    }
  }
);

export const fetchStudentDetail = createAsyncThunk(
  "students/detail",
  async (id: string, { rejectWithValue }) => {
    try {
      const res = await http.get<StudentDetail>(`/students/${id}`);
      return res.data;
    } catch (e) {
      return rejectWithValue(apiErrorMessage(e));
    }
  }
);

export const createStudent = createAsyncThunk(
  "students/create",
  async (data: Partial<Student>, { rejectWithValue }) => {
    try {
      const res = await http.post<Student>("/students", data);
      return res.data;
    } catch (e) {
      return rejectWithValue(apiErrorMessage(e));
    }
  }
);

export const updateStudent = createAsyncThunk(
  "students/update",
  async ({ id, data }: { id: string; data: Partial<Student> }, { rejectWithValue }) => {
    try {
      const res = await http.put<Student>(`/students/${id}`, data);
      return res.data;
    } catch (e) {
      return rejectWithValue(apiErrorMessage(e));
    }
  }
);

export const deleteStudent = createAsyncThunk(
  "students/delete",
  async (id: string, { rejectWithValue }) => {
    try {
      await http.delete(`/students/${id}`);
      return id;
    } catch (e) {
      return rejectWithValue(apiErrorMessage(e));
    }
  }
);

const studentsSlice = createSlice({
  name: "students",
  initialState,
  reducers: {
    clearDetail(state) {
      state.detail = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchStudents.pending, (s) => {
        s.status = "loading";
      })
      .addCase(fetchStudents.fulfilled, (s, a) => {
        s.status = "succeeded";
        s.items = a.payload.data;
        s.total = a.payload.total;
        s.page = a.payload.page;
        s.pages = a.payload.pages;
      })
      .addCase(fetchStudents.rejected, (s, a) => {
        s.status = "failed";
        s.error = (a.payload as string) ?? "Failed to load students";
      })
      .addCase(fetchStudentDetail.fulfilled, (s, a) => {
        s.detail = a.payload;
      })
      .addCase(createStudent.pending, (s) => {
        s.mutating = true;
      })
      .addCase(createStudent.fulfilled, (s, a) => {
        s.mutating = false;
        s.items.unshift(a.payload);
        s.total += 1;
      })
      .addCase(createStudent.rejected, (s) => {
        s.mutating = false;
      })
      .addCase(updateStudent.pending, (s) => {
        s.mutating = true;
      })
      .addCase(updateStudent.fulfilled, (s, a) => {
        s.mutating = false;
        const i = s.items.findIndex((x) => x.id === a.payload.id);
        if (i >= 0) s.items[i] = a.payload;
        if (s.detail?.id === a.payload.id) s.detail = { ...s.detail, ...a.payload };
      })
      .addCase(updateStudent.rejected, (s) => {
        s.mutating = false;
      })
      .addCase(deleteStudent.fulfilled, (s, a) => {
        s.items = s.items.filter((x) => x.id !== a.payload);
        s.total = Math.max(0, s.total - 1);
      });
  },
});

export const { clearDetail } = studentsSlice.actions;
export default studentsSlice.reducer;
