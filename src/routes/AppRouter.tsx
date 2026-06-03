import { MainLayout } from "@/layouts/MainLayout";
import { AdminDashboardPage } from "@/pages/AdminDashboardPage";
import { AdminOrganizerApprovalPage } from "@/pages/AdminOrganizerApprovalPage";
import { AdminTournamentApprovalPage } from "@/pages/AdminTournamentApprovalPage";
import { BecomeOrganizerPage } from "@/pages/BecomeOrganizerPage";
import { ForgotPasswordPage } from "@/pages/ForgotPasswordPage";
import { LandingPage } from "@/pages/LandingPage";
import { LoginPage } from "@/pages/LoginPage";
import { MatchRoomPage } from "@/pages/MatchRoomPage";
import { OrganizerDashboardPage } from "@/pages/OrganizerDashboardPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { PlayerProfilePage } from "@/pages/PlayerProfilePage";
import { RegisterPage } from "@/pages/RegisterPage";
import { TeamDashboardPage } from "@/pages/TeamDashboardPage";
import { TeamProfilePage } from "@/pages/TeamProfilePage";
import { TournamentDetailPage } from "@/pages/TournamentDetailPage";
import { TournamentListPage } from "@/pages/TournamentListPage";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { PublicOnlyRoute, RoleRoute } from "./RoleRoute";

const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: "tournaments", element: <TournamentListPage /> },
      { path: "tournaments/:id", element: <TournamentDetailPage /> },
      { path: "tournaments/:id/bracket", element: <TournamentDetailPage /> },
      {
        path: "tournaments/:id/leaderboard",
        element: <TournamentDetailPage />,
      },
      { path: "brackets/:id", element: <TournamentDetailPage /> },
      { path: "leaderboards/:id", element: <TournamentDetailPage /> },
      { path: "teams/:id", element: <TeamProfilePage /> },
      { path: "players/:id", element: <PlayerProfilePage /> },
      {
        element: <PublicOnlyRoute />,
        children: [
          { path: "login", element: <LoginPage /> },
          { path: "forgot-password", element: <ForgotPasswordPage /> },
          { path: "register", element: <RegisterPage /> },
        ],
      },
      {
        element: <ProtectedRoute />,
        children: [
          { path: "profile", element: <ProfilePage /> },
          { path: "profile/settings", element: <ProfilePage /> },
          { path: "matches/:id", element: <MatchRoomPage /> },
          {
            element: <RoleRoute allowedRoles={["PLAYER", "ORGANIZER"]} />,
            children: [
              { path: "player", element: <TeamDashboardPage /> },
              { path: "team", element: <TeamDashboardPage /> },
              { path: "team/create", element: <TeamDashboardPage /> },
              { path: "team/invites", element: <TeamDashboardPage /> },
              { path: "team/matches", element: <TeamDashboardPage /> },
              { path: "become-organizer", element: <BecomeOrganizerPage /> },
            ],
          },
          {
            element: <RoleRoute allowedRoles={["ORGANIZER"]} />,
            children: [
              { path: "organizer", element: <OrganizerDashboardPage /> },
              {
                path: "organizer/tournaments/new",
                element: <OrganizerDashboardPage />,
              },
              {
                path: "organizer/tournaments/:id",
                element: <OrganizerDashboardPage />,
              },
              {
                path: "organizer/registrations",
                element: <OrganizerDashboardPage />,
              },
              { path: "organizer/brackets", element: <OrganizerDashboardPage /> },
              { path: "organizer/matches", element: <OrganizerDashboardPage /> },
              { path: "organizer/disputes", element: <OrganizerDashboardPage /> },
              {
                path: "organizer/analytics",
                element: <OrganizerDashboardPage />,
              },
              {
                path: "organizer/announcements",
                element: <OrganizerDashboardPage />,
              },
            ],
          },
          {
            element: <RoleRoute allowedRoles={["ADMIN"]} />,
            children: [
              { path: "admin", element: <AdminDashboardPage /> },
              { path: "admin/users", element: <AdminDashboardPage /> },
              { path: "admin/tournaments", element: <AdminDashboardPage /> },
              { path: "admin/disputes", element: <AdminDashboardPage /> },
              { path: "admin/audit-logs", element: <AdminDashboardPage /> },
              { path: "admin/analytics", element: <AdminDashboardPage /> },
              {
                path: "admin/organizer-requests",
                element: <AdminOrganizerApprovalPage />,
              },
              {
                path: "admin/tournament-approvals",
                element: <AdminTournamentApprovalPage />,
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
