import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { store, useAppDispatch } from "./store";
import { fetchMe, logoutUser } from "./store/slices/authSlice";
import { setUnauthorizedHandler, TOKEN_KEY } from "./api/http";
import { ToastHost } from "./components/ui";
import { getInitialTheme } from "./hooks/useTheme";

function Bootstrap() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    // Apply persisted theme before first paint of the app shell
    const t = getInitialTheme();
    document.documentElement.classList.toggle("dark", t === "dark");

    setUnauthorizedHandler(() => {
      dispatch(logoutUser());
      router.navigate("/login");
    });

    if (localStorage.getItem(TOKEN_KEY)) {
      dispatch(fetchMe());
    } else {
      // still mark initialized so /login renders immediately
      dispatch(fetchMe()).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <RouterProvider router={router} />;
}

export default function App() {
  return (
    <>
      <Bootstrap />
      <ToastHost />
    </>
  );
}

export { store };
