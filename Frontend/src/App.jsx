import { Route, Routes, useLocation } from "react-router-dom";
import Navbar from "./components/layout/Navbar";
import ProtectedRoute from "./routes/ProtectedRoute";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import TreesPage from "./pages/TreesPage";
import EventsPage from "./pages/EventsPage";
import AlertsPage from "./pages/AlertsPage";
import ProfilePage from "./pages/ProfilePage";
import ProfileEditPage from "./pages/ProfileEditPage";
import NotFoundPage from "./pages/NotFoundPage";
import LandingPage from "./pages/LandingPage";
import AdminLayout from "./layouts/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminAlertsPage from "./pages/admin/AdminAlertsPage";
import AdminVolunteersPage from "./pages/admin/AdminVolunteersPage";
import AdminLeaderboardPage from "./pages/admin/AdminLeaderboardPage";
import AdminMapPage from "./pages/admin/AdminMapPage";
import AdminReportsPage from "./pages/admin/AdminReportsPage";
import AdminSettingsPage from "./pages/admin/AdminSettingsPage";

function App() {
  const location = useLocation();
  const isLanding = location.pathname === "/";
  const isAuthPage = location.pathname === "/login" || location.pathname === "/register";
  const isAdminPage = location.pathname.startsWith("/admin");

  return (
    <div className="min-h-screen text-slate-800">
      <Navbar />
      <main
        className={
          isLanding
            ? ""
            : isAuthPage
            ? "app-container flex min-h-[calc(100vh-7rem)] items-center py-6 sm:py-8"
            : isAdminPage
            ? "min-h-[calc(100vh-7rem)]"
            : "app-container py-6 sm:py-8"
        }
      >
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trees"
            element={
              <ProtectedRoute>
                <TreesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/events"
            element={
              <ProtectedRoute>
                <EventsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/alerts"
            element={
              <ProtectedRoute>
                <AlertsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile/edit"
            element={
              <ProtectedRoute>
                <ProfileEditPage />
              </ProtectedRoute>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminLayout>
                  <AdminDashboard />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/alerts"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminLayout>
                  <AdminAlertsPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/volunteers"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminLayout>
                  <AdminVolunteersPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/leaderboard"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminLayout>
                  <AdminLeaderboardPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/map"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminLayout>
                  <AdminMapPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminLayout>
                  <AdminReportsPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminLayout>
                  <AdminSettingsPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
