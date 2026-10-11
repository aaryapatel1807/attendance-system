import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Toast, ToastType } from "../../types";

interface NotificationsState {
  toasts: Toast[];
}

const initialState: NotificationsState = { toasts: [] };

let nextId = 1;

const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    notify(
      state,
      action: PayloadAction<{ type: ToastType; title: string; message?: string }>
    ) {
      state.toasts.push({ id: nextId++, ...action.payload });
      if (state.toasts.length > 5) state.toasts.shift();
    },
    dismissToast(state, action: PayloadAction<number>) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
    clearToasts(state) {
      state.toasts = [];
    },
  },
});

export const { notify, dismissToast, clearToasts } = notificationsSlice.actions;
export default notificationsSlice.reducer;
