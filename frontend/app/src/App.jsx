import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import AppShell from "@/components/layout/AppShell";
import {
  ProtectedRoute,
  PublicOnlyRoute,
  RoleRoute,
  RootRedirect,
} from "@/components/routing/RouteGuards";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import DashboardPage from "@/pages/app/DashboardPage";
import MoviesPage from "@/pages/app/MoviesPage";
import ScreeningsPage from "@/pages/app/ScreeningsPage";
import ReservationsPage from "@/pages/app/ReservationsPage";
import HallsPage from "@/pages/app/HallsPage";
import UsersPage from "@/pages/app/UsersPage";
import ChatbotPage from "@/pages/app/ChatbotPage";
import ContactPage from "@/pages/app/ContactPage";
import MovieDetailPage from "@/pages/app/MovieDetailPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<RootRedirect />} />

        <Route element={<AppShell />}>
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>
          {/* Public pages — accessible without an account */}
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/movies" element={<MoviesPage />} />
          <Route path="/movies/:id" element={<MovieDetailPage />} />
          <Route path="/screenings" element={<ScreeningsPage />} />
          <Route path="/contact" element={<ContactPage />} />

          {/* Protected pages — require login */}
          <Route element={<ProtectedRoute />}>
            <Route path="/reservations" element={<ReservationsPage />} />
            <Route path="/chat" element={<ChatbotPage />} />

            <Route element={<RoleRoute allowedRoles={["admin"]} />}>
              <Route path="/halls" element={<HallsPage />} />
              <Route path="/users" element={<UsersPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
