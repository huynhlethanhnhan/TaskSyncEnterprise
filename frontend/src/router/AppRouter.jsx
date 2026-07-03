// 📂 FILE: src/router/AppRouter.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "../pages/auth/LoginPage";
import ChangePasswordPage from "../pages/auth/ChangePasswordPage";
import AuditLogPage from "../pages/audit/AuditLogPage";
import DashboardPage from "../pages/dashboard/DashboardPage";
import ProjectPage from "../pages/projects/ProjectPage";
import ProjectDetailPage from "../pages/projects/ProjectDetailPage";
import TaskPage from "../pages/tasks/TaskPage";
import CalendarPage from "../pages/calendar/CalendarPage";
import DepartmentPage from "../pages/departments/DepartmentPage";
import DepartmentDetailPage from "../pages/departments/DepartmentDetailPage";
import EmployeePage from "../pages/employees/EmployeePage";
import EmployeeDetailPage from "../pages/employees/EmployeeDetailPage";
import NotificationsPage from "../pages/notifications/NotificationsPage";
import VacationPage from "../pages/vacations/VacationPage";
import VacationDetailPage from "../pages/vacations/VacationDetailPage";
import SettingsPage from "../pages/settings/SettingsPage";
import ProfilePage from "../pages/profile/ProfilePage";
import ProtectedRoute from "./ProtectedRoute";
import MainLayout from "../layouts/MainLayout"; // Layout 3 cột mới của chúng ta

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/change-password" element={
          <ProtectedRoute>
            <ChangePasswordPage />
          </ProtectedRoute>
        } />
        {/* 📊 Route Dashboard: Được bọc trong MainLayout mới */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <MainLayout><DashboardPage /></MainLayout>
          </ProtectedRoute>
        } />

        <Route path="/projects" element={
          <ProtectedRoute>
            <MainLayout><ProjectPage /></MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/projects/:id" element={
          <ProtectedRoute>
            <MainLayout><ProjectDetailPage /></MainLayout>
          </ProtectedRoute>
        } />

        <Route path="/tasks" element={
          <ProtectedRoute>
            <MainLayout><TaskPage /></MainLayout>
          </ProtectedRoute>
        } />

        <Route path="/calendar" element={
          <ProtectedRoute>
            <MainLayout><CalendarPage /></MainLayout>
          </ProtectedRoute>
        } />

        <Route path="/departments" element={
          <ProtectedRoute>
            <MainLayout><DepartmentPage /></MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/departments/:id" element={
          <ProtectedRoute>
            <MainLayout><DepartmentDetailPage /></MainLayout>
          </ProtectedRoute>
        } />

        <Route path="/employees" element={
          <ProtectedRoute>
            <MainLayout><EmployeePage /></MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/employees/:id" element={
          <ProtectedRoute>
            <MainLayout><EmployeeDetailPage /></MainLayout>
          </ProtectedRoute>
        } />

        <Route path="/notifications" element={
          <ProtectedRoute>
            <MainLayout><NotificationsPage /></MainLayout>
          </ProtectedRoute>
        } />

        <Route path="/vacations" element={
          <ProtectedRoute>
            <MainLayout><VacationPage /></MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/vacations/:id" element={
          <ProtectedRoute>
            <MainLayout><VacationDetailPage /></MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <MainLayout><SettingsPage /></MainLayout>
          </ProtectedRoute>
        } />

        <Route path="/profile" element={
          <ProtectedRoute>
            <MainLayout><ProfilePage /></MainLayout>
          </ProtectedRoute>
        } />

        {/* 📜 Route Audit: Cũng được bọc trong MainLayout mới luôn! */}
        <Route path="/audit" element={
          <ProtectedRoute>
            <MainLayout><AuditLogPage /></MainLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </BrowserRouter>
  );
}