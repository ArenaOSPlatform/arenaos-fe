import { MainLayout } from "@/layouts/MainLayout";
import { AdminDashboardPage } from "@/pages/AdminDashboardPage";
import { AdminOrganizerApprovalPage } from "@/pages/AdminOrganizerApprovalPage";
import { AdminTournamentApprovalPage } from "@/pages/AdminTournamentApprovalPage";
import { BecomeOrganizerPage } from "@/pages/BecomeOrganizerPage";
import { LandingPage } from "@/pages/LandingPage";
import { LoginPage } from "@/pages/LoginPage";
import { MatchRoomPage } from "@/pages/MatchRoomPage";
import { OrganizerDashboardPage } from "@/pages/OrganizerDashboardPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { TeamDashboardPage } from "@/pages/TeamDashboardPage";
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
      {
        element: <PublicOnlyRoute />,
        children: [
          { path: "login", element: <LoginPage /> },
          { path: "register", element: <RegisterPage /> },
        ],
      },
      {
        element: <ProtectedRoute />,
        children: [
          { path: "matches/:id", element: <MatchRoomPage /> },
          {
            element: <RoleRoute allowedRoles={["PLAYER"]} />,
            children: [
              { path: "team", element: <TeamDashboardPage /> },
              { path: "become-organizer", element: <BecomeOrganizerPage /> },
            ],
          },
          {
            element: <RoleRoute allowedRoles={["ORGANIZER"]} />,
            children: [
              { path: "organizer", element: <OrganizerDashboardPage /> },
            ],
          },
          {
            element: <RoleRoute allowedRoles={["ADMIN"]} />,
            children: [
              { path: "admin", element: <AdminDashboardPage /> },
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
