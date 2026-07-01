import { MainLayout } from "@/layouts/MainLayout";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { PublicOnlyRoute, RoleRoute } from "./RoleRoute";

const loadAdminDashboard = async () => ({
  Component: (await import("@/pages/AdminDashboardPage")).AdminDashboardPage,
});
const loadAdminOrganizerApproval = async () => ({
  Component: (await import("@/pages/AdminOrganizerApprovalPage"))
    .AdminOrganizerApprovalPage,
});
const loadAdminTournamentApproval = async () => ({
  Component: (await import("@/pages/AdminTournamentApprovalPage"))
    .AdminTournamentApprovalPage,
});
const loadBecomeOrganizer = async () => ({
  Component: (await import("@/pages/BecomeOrganizerPage")).BecomeOrganizerPage,
});
const loadForgotPassword = async () => ({
  Component: (await import("@/pages/ForgotPasswordPage")).ForgotPasswordPage,
});
const loadLanding = async () => ({
  Component: (await import("@/pages/LandingPage")).LandingPage,
});
const loadLogin = async () => ({
  Component: (await import("@/pages/LoginPage")).LoginPage,
});
const loadMatchRoom = async () => ({
  Component: (await import("@/pages/MatchRoomPage")).MatchRoomPage,
});
const loadOrganizerDashboard = async () => ({
  Component: (await import("@/pages/OrganizerDashboardPage"))
    .OrganizerDashboardPage,
});
const loadProfile = async () => ({
  Component: (await import("@/pages/ProfilePage")).ProfilePage,
});
const loadPlayerProfile = async () => ({
  Component: (await import("@/pages/PlayerProfilePage")).PlayerProfilePage,
});
const loadRegister = async () => ({
  Component: (await import("@/pages/RegisterPage")).RegisterPage,
});
const loadTeamDashboard = async () => ({
  Component: (await import("@/pages/TeamDashboardPage")).TeamDashboardPage,
});
const loadTeamProfile = async () => ({
  Component: (await import("@/pages/TeamProfilePage")).TeamProfilePage,
});
const loadTournamentDetail = async () => ({
  Component: (await import("@/pages/TournamentDetailPage"))
    .TournamentDetailPage,
});
const loadTournamentList = async () => ({
  Component: (await import("@/pages/TournamentListPage")).TournamentListPage,
});

const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      { index: true, lazy: loadLanding },
      { path: "tournaments", lazy: loadTournamentList },
      { path: "tournaments/:id", lazy: loadTournamentDetail },
      { path: "tournaments/:id/bracket", lazy: loadTournamentDetail },
      {
        path: "tournaments/:id/leaderboard",
        lazy: loadTournamentDetail,
      },
      { path: "brackets/:id", lazy: loadTournamentDetail },
      { path: "leaderboards/:id", lazy: loadTournamentDetail },
      { path: "teams/:id", lazy: loadTeamProfile },
      { path: "players/:id", lazy: loadPlayerProfile },
      {
        element: <PublicOnlyRoute />,
        children: [
          { path: "login", lazy: loadLogin },
          { path: "forgot-password", lazy: loadForgotPassword },
          { path: "register", lazy: loadRegister },
        ],
      },
      {
        element: <ProtectedRoute />,
        children: [
          { path: "profile", lazy: loadProfile },
          { path: "profile/settings", lazy: loadProfile },
          { path: "matches/:id", lazy: loadMatchRoom },
          {
            element: <RoleRoute allowedRoles={["PLAYER"]} />,
            children: [
              { path: "player", lazy: loadTeamDashboard },
              { path: "team", lazy: loadTeamDashboard },
              { path: "team/create", lazy: loadTeamDashboard },
              { path: "team/invites", lazy: loadTeamDashboard },
              { path: "team/matches", lazy: loadTeamDashboard },
              { path: "become-organizer", lazy: loadBecomeOrganizer },
            ],
          },
          {
            element: <RoleRoute allowedRoles={["ORGANIZER"]} />,
            children: [
              { path: "organizer", lazy: loadOrganizerDashboard },
              {
                path: "organizer/tournaments/new",
                lazy: loadOrganizerDashboard,
              },
              {
                path: "organizer/tournaments/:id",
                lazy: loadOrganizerDashboard,
              },
              {
                path: "organizer/registrations",
                lazy: loadOrganizerDashboard,
              },
              { path: "organizer/brackets", lazy: loadOrganizerDashboard },
              { path: "organizer/matches", lazy: loadOrganizerDashboard },
              { path: "organizer/disputes", lazy: loadOrganizerDashboard },
              {
                path: "organizer/analytics",
                lazy: loadOrganizerDashboard,
              },
              {
                path: "organizer/announcements",
                lazy: loadOrganizerDashboard,
              },
            ],
          },
          {
            element: <RoleRoute allowedRoles={["ADMIN"]} />,
            children: [
              { path: "admin", lazy: loadAdminDashboard },
              { path: "admin/users", lazy: loadAdminDashboard },
              { path: "admin/tournaments", lazy: loadAdminDashboard },
              { path: "admin/disputes", lazy: loadAdminDashboard },
              { path: "admin/audit-logs", lazy: loadAdminDashboard },
              { path: "admin/analytics", lazy: loadAdminDashboard },
              {
                path: "admin/organizer-requests",
                lazy: loadAdminOrganizerApproval,
              },
              {
                path: "admin/tournament-approvals",
                lazy: loadAdminTournamentApproval,
              },
            ],
          },
        ],
      },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
