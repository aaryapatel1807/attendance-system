import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Attendance from "./pages/Attendance";
import Students from "./pages/Students";
import StudentDetail from "./pages/StudentDetail";
import RegisterFace from "./pages/RegisterFace";
import Classes from "./pages/Classes";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import { useAppSelector } from "./store";

function Protected() {
  const { user, initialized } = useAppSelector((s) => s.auth);
  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] dark:bg-night-950">
        <div className="grad-brand h-14 w-14 animate-spin rounded-[20px]" style={{ animationDuration: "1.2s" }} />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function PublicOnly() {
  const { user, initialized } = useAppSelector((s) => s.auth);
  if (!initialized) return null;
  if (user) return <Navigate to="/" replace />;
  return <Outlet />;
}

export const router = createBrowserRouter([
  {
    element: <PublicOnly />,
    children: [{ path: "/login", element: <Login /> }],
  },
  {
    element: <Protected />,
    children: [
      {
        element: <Layout />,
        children: [
          { path: "/", element: <Dashboard /> },
          { path: "/attendance", element: <Attendance /> },
          { path: "/students", element: <Students /> },
          { path: "/students/register-face", element: <RegisterFace /> },
          { path: "/students/:id", element: <StudentDetail /> },
          { path: "/classes", element: <Classes /> },
          { path: "/reports", element: <Reports /> },
          { path: "/settings", element: <Settings /> },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
