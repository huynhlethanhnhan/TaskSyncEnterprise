import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "../pages/auth/LoginPage.tsx";
import { ForgotPasswordPage } from "../pages/auth/ForgotPasswordPage";
import { UnauthorizedPage } from "../pages/auth/UnauthorizedPage";
import { NotFoundPage } from "../pages/auth/NotFoundPage";
import { ComponentShowcasePage } from "../pages/dev/ComponentShowcasePage";
import { ApplicationShell } from "../layouts/ApplicationShell";
import ProtectedRoute from "./ProtectedRoute";

// Canonical TypeScript workspace pages. Explicit extensions prevent Vite from
// resolving same-named legacy JSX modules first.
import DashboardPage from "../pages/dashboard/DashboardPage.tsx";
import ProjectPage from "../pages/projects/ProjectPage.tsx";
import ProjectDetailPage from "../pages/projects/ProjectDetailPage.tsx";
import TaskPage from "../pages/tasks/TaskPage.tsx";
import CalendarPage from "../pages/calendar/CalendarPage";
import DepartmentPage from "../pages/departments/DepartmentPage.tsx";
import DepartmentDetailPage from "../pages/departments/DepartmentDetailPage.tsx";
import EmployeePage from "../pages/employees/EmployeePage.tsx";
import EmployeeDetailPage from "../pages/employees/EmployeeDetailPage.tsx";
import NotificationsPage from "../pages/notifications/NotificationsPage.tsx";
import VacationPage from "../pages/vacations/VacationPage";
import VacationDetailPage from "../pages/vacations/VacationDetailPage";
import SettingsPage from "../pages/settings/SettingsPage";
import ProfilePage from "../pages/profile/ProfilePage.tsx";
import { AuditLogPage } from "../pages/audit/AuditLogPage.tsx";
import { TeamPage } from "../pages/teams/TeamPage.tsx";
import TeamDetailPage from "../pages/teams/TeamDetailPage.tsx";

// New Workspaces Redesign imports
import MyWorkPage from "../pages/dashboard/MyWorkPage.tsx";
import BacklogPage from "../pages/tasks/BacklogPage.tsx";
import SprintsPage from "../pages/tasks/SprintsPage.tsx";
import TopicsPage from "../pages/profile/TopicsPage.tsx";
import FeedbackPage from "../pages/profile/FeedbackPage.tsx";
import FilesPage from "../pages/profile/FilesPage.tsx";
import ReportsPage from "../pages/profile/ReportsPage.tsx";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Authentication Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="/404" element={<NotFoundPage />} />

        {/* Development Component Showcase Route */}
        <Route
          path="/dev/components"
          element={
            <ProtectedRoute>
              <ApplicationShell>
                <ComponentShowcasePage />
              </ApplicationShell>
            </ProtectedRoute>
          }
        />

        {/* Protected Application Shell Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <ApplicationShell>
                <DashboardPage />
              </ApplicationShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/projects"
          element={
            <ProtectedRoute>
              <ApplicationShell>
                <ProjectPage />
              </ApplicationShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/:id"
          element={
            <ProtectedRoute>
              <ApplicationShell>
                <ProjectDetailPage />
              </ApplicationShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/tasks"
          element={
            <ProtectedRoute>
              <ApplicationShell>
                <TaskPage />
              </ApplicationShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/calendar"
          element={
            <ProtectedRoute>
              <ApplicationShell>
                <CalendarPage />
              </ApplicationShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/departments"
          element={
            <ProtectedRoute>
              <ApplicationShell>
                <DepartmentPage />
              </ApplicationShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/departments/:id"
          element={
            <ProtectedRoute>
              <ApplicationShell>
                <DepartmentDetailPage />
              </ApplicationShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/employees"
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager', 1, 2]}>
              <ApplicationShell>
                <EmployeePage />
              </ApplicationShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/employees/:id"
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager', 1, 2]}>
              <ApplicationShell>
                <EmployeeDetailPage />
              </ApplicationShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <ApplicationShell>
                <NotificationsPage />
              </ApplicationShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/vacations"
          element={
            <ProtectedRoute>
              <ApplicationShell>
                <VacationPage />
              </ApplicationShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/vacations/:id"
          element={
            <ProtectedRoute>
              <ApplicationShell>
                <VacationDetailPage />
              </ApplicationShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <ApplicationShell>
                <SettingsPage />
              </ApplicationShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ApplicationShell>
                <ProfilePage />
              </ApplicationShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/audit"
          element={
            <ProtectedRoute allowedRoles={['admin', 1]}>
              <ApplicationShell>
                <AuditLogPage />
              </ApplicationShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/teams"
          element={
            <ProtectedRoute>
              <ApplicationShell>
                <TeamPage />
              </ApplicationShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/teams/:id"
          element={
            <ProtectedRoute>
              <ApplicationShell>
                <TeamDetailPage />
              </ApplicationShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/my-work"
          element={
            <ProtectedRoute>
              <ApplicationShell>
                <MyWorkPage />
              </ApplicationShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/backlog"
          element={
            <ProtectedRoute>
              <ApplicationShell>
                <BacklogPage />
              </ApplicationShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/sprints"
          element={
            <ProtectedRoute>
              <ApplicationShell>
                <SprintsPage />
              </ApplicationShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/topics"
          element={
            <ProtectedRoute>
              <ApplicationShell>
                <TopicsPage />
              </ApplicationShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/feedback"
          element={
            <ProtectedRoute>
              <ApplicationShell>
                <FeedbackPage />
              </ApplicationShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/files"
          element={
            <ProtectedRoute>
              <ApplicationShell>
                <FilesPage />
              </ApplicationShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <ApplicationShell>
                <ReportsPage />
              </ApplicationShell>
            </ProtectedRoute>
          }
        />

        {/* Redirect Root to Dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Catch-all 404 Route */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
