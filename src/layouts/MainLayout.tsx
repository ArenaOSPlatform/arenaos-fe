import { useEffect, useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  Loader2,
  LogOut,
  Shield,
  Sword,
  Trophy,
  User,
  UserCheck,
  Users,
  Radio,
  ClipboardCheck,
} from "lucide-react";
import { getMe, logout } from "@/services/auth.service";
import {
  authSessionExpiredEvent,
  clearAuthStorage,
} from "@/services/api";
import {
  getMyNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/services/notification.service";
import { socket } from "@/sockets/socket";
import { acceptTeamInvite, rejectTeamInvite } from "@/services/team.service";
import {
  getCurrentUserRole,
  setStoredUserRole,
} from "@/routes/route-role";
import { EmptyState, useConfirm, useToast } from "@/components/ui";

type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  metadata: string | null;
};

export function MainLayout() {
  const toast = useToast();
  const confirm = useConfirm();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [notificationActionId, setNotificationActionId] = useState<string | null>(
    null,
  );
  const [authenticated, setAuthenticated] = useState(() =>
    Boolean(localStorage.getItem("accessToken")),
  );
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    async function setupNotifications() {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setAuthenticated(false);
        setNotifications([]);
        clearAuthStorage({ notify: false });
        return;
      }

      setAuthenticated(true);
      setNotifications([]);

      try {
        const meRes = await getMe();
        const userId = meRes.data.sub;
        const role = meRes.data.role;

        if (role === "PLAYER" || role === "ORGANIZER" || role === "ADMIN") {
          setStoredUserRole(role);
        }

        console.log("JOIN USER:", userId);

        if (!socket.connected) {
          socket.connect();
        }

        socket.emit("join:user", userId);

        const notiRes = await getMyNotifications();
        setNotifications(notiRes.data);

        socket.off("notification:new");

        socket.on("notification:new", (data: Notification) => {
          console.log("FE realtime notification:", data);
          setNotifications((prev) => [data, ...prev]);
          toast.info(data.message, data.title);
        });
      } catch (error) {
        console.log("Notification setup failed", error);
      }
    }

    setupNotifications();

    return () => {
      socket.off("notification:new");
    };
  }, [location.pathname, toast]);

  useEffect(() => {
    function handleSessionExpired() {
      socket.disconnect();
      setAuthenticated(false);
      setNotifications([]);
      setOpen(false);
      toast.warning("Session expired. Please log in again.");
      navigate("/login", { replace: true });
    }

    window.addEventListener(authSessionExpiredEvent, handleSessionExpired);

    return () => {
      window.removeEventListener(authSessionExpiredEvent, handleSessionExpired);
    };
  }, [navigate, toast]);

  const userRole = authenticated ? getCurrentUserRole() : null;
  const unreadCount = notifications.filter((item) => !item.isRead).length;
  async function handleReadNotification(id: string) {
    await markNotificationAsRead(id);

    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isRead: true } : item)),
    );
  }

  async function handleReadAllNotifications() {
    await markAllNotificationsAsRead();
    setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
  }

  async function handleAcceptInvite(notification: Notification) {
    if (!notification.metadata) return;

    try {
      setNotificationActionId(notification.id);

      const metadata = JSON.parse(notification.metadata) as {
        inviteId?: string;
      };

      if (!metadata.inviteId) return;

      await acceptTeamInvite(metadata.inviteId);
      await handleReadNotification(notification.id);
      toast.success("Team invite accepted.");
    } catch {
      toast.error("Could not accept this invite.");
    } finally {
      setNotificationActionId(null);
    }
  }

  async function handleRejectInvite(notification: Notification) {
    if (!notification.metadata) return;

    const confirmed = await confirm({
      title: "Reject team invite?",
      description: "This notification will be marked as handled after rejection.",
      confirmText: "Reject",
      tone: "danger",
    });

    if (!confirmed) return;

    try {
      setNotificationActionId(notification.id);

      const metadata = JSON.parse(notification.metadata) as {
        inviteId?: string;
      };

      if (!metadata.inviteId) return;

      await rejectTeamInvite(metadata.inviteId);
      await handleReadNotification(notification.id);
      toast.success("Team invite rejected.");
    } catch {
      toast.error("Could not reject this invite.");
    } finally {
      setNotificationActionId(null);
    }
  }

  async function handleLogout() {
    const confirmed = await confirm({
      title: "Log out?",
      description:
        "You will return to the login screen and the live socket will disconnect.",
      confirmText: "Logout",
      tone: "warning",
    });

    if (!confirmed) return;

    try {
      await logout();
    } catch {
      // The local session should still be cleared if the token is already stale.
    }

    clearAuthStorage({ notify: false });
    socket.disconnect();
    setAuthenticated(false);
    setNotifications([]);
    setOpen(false);
    toast.info("You have been logged out.");
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-[#0B1020] text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0B1020]/80 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-3 text-2xl font-black">
            <Trophy className="text-cyan-400" />
            ArenaOS
          </Link>

          <div className="hidden items-center gap-6 lg:flex">
            <Link
              to="/tournaments"
              className="text-sm font-bold text-white/60 hover:text-cyan-400"
            >
              Tournaments
            </Link>

            <Link
              to="/matches/1"
              className="flex items-center gap-2 text-sm font-bold text-white/60 hover:text-cyan-400"
            >
              <Radio size={16} />
              Match Room
            </Link>

            {userRole === "PLAYER" && (
              <>
                <Link
                  to="/team"
                  className="flex items-center gap-2 text-sm font-bold text-white/60 hover:text-cyan-400"
                >
                  <Users size={16} />
                  Team
                </Link>
                <Link
                  to="/become-organizer"
                  className="flex items-center gap-2 text-sm font-bold text-white/60 hover:text-cyan-400"
                >
                  <UserCheck size={16} />
                  Become Organizer
                </Link>
              </>
            )}

            {userRole === "ORGANIZER" && (
              <Link
                to="/organizer"
                className="flex items-center gap-2 text-sm font-bold text-white/60 hover:text-cyan-400"
              >
                <Shield size={16} />
                Organizer
              </Link>
            )}

            {userRole === "ADMIN" && (
              <>
                <Link
                  to="/admin"
                  className="flex items-center gap-2 text-sm font-bold text-white/60 hover:text-cyan-400"
                >
                  <Sword size={16} />
                  Admin
                </Link>
                <Link
                  to="/admin/organizer-requests"
                  className="flex items-center gap-2 text-sm font-bold text-white/60 hover:text-cyan-400"
                >
                  <UserCheck size={16} />
                  Organizer Requests
                </Link>
                <Link
                  to="/admin/tournament-approvals"
                  className="flex items-center gap-2 text-sm font-bold text-white/60 hover:text-cyan-400"
                >
                  <ClipboardCheck size={16} />
                  Tournament Approvals
                </Link>
              </>
            )}
          </div>

          <div className="relative flex items-center gap-3">
            <button
              onClick={() => setOpen((prev) => !prev)}
              className="relative rounded-2xl border border-white/10 bg-white/5 p-3 hover:bg-white/10"
            >
              <Bell size={18} />

              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-red-500 text-xs font-black">
                  {unreadCount}
                </span>
              )}
            </button>

            {open && (
              <div className="absolute right-0 top-14 z-50 w-80 rounded-3xl border border-white/10 bg-[#111827] p-4 shadow-2xl">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="font-black">Notifications</h3>

                  {unreadCount > 0 && (
                    <button
                      onClick={handleReadAllNotifications}
                      className="rounded-xl bg-white/10 px-3 py-1 text-xs font-bold text-white/70 hover:bg-white/15"
                    >
                      Mark all
                    </button>
                  )}
                </div>

                {notifications.length === 0 ? (
                  <EmptyState
                    compact
                    icon={Bell}
                    title="No notifications"
                    description="Invites and match updates will appear here."
                  />
                ) : (
                  <div className="max-h-80 space-y-3 overflow-y-auto">
                    {notifications.map((item) => (
                      <div
                        key={item.id}
                        className={`w-full rounded-2xl p-4 text-left transition ${
                          item.isRead
                            ? "bg-black/30 opacity-60"
                            : "bg-cyan-400/10"
                        }`}
                      >
                        <div
                          onClick={() => handleReadNotification(item.id)}
                          className="cursor-pointer"
                        >
                          <p className="font-bold">{item.title}</p>

                          <p className="mt-1 text-sm text-white/60">
                            {item.message}
                          </p>

                          <div className="mt-2 flex items-center justify-between gap-3 text-xs">
                            <p className="text-cyan-400">{item.type}</p>

                            <span
                              className={`rounded-full px-2 py-1 font-bold ${
                                item.isRead
                                  ? "bg-white/10 text-white/50"
                                  : "bg-emerald-400/15 text-emerald-300"
                              }`}
                            >
                              {item.isRead ? "Đã đọc" : "Chưa đọc"}
                            </span>
                          </div>
                        </div>

                        {item.type === "TEAM_INVITE" && !item.isRead && (
                          <div className="mt-3 flex gap-2">
                            <button
                              onClick={() => handleAcceptInvite(item)}
                              disabled={notificationActionId === item.id}
                              className="flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2 text-xs font-black text-black hover:bg-cyan-300 disabled:opacity-50"
                            >
                              {notificationActionId === item.id && (
                                <Loader2 size={14} className="animate-spin" />
                              )}
                              Accept
                            </button>

                            <button
                              onClick={() => handleRejectInvite(item)}
                              disabled={notificationActionId === item.id}
                              className="rounded-xl bg-red-400 px-4 py-2 text-xs font-black text-black hover:bg-red-300 disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {authenticated ? (
              <button
                onClick={handleLogout}
                className="hidden items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-2 text-sm font-bold hover:bg-white/10 md:flex"
              >
                <LogOut size={16} />
                Logout
              </button>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hidden rounded-2xl border border-white/10 bg-white/5 px-5 py-2 text-sm font-bold hover:bg-white/10 md:block"
                >
                  Login
                </Link>

                <Link
                  to="/register"
                  className="flex items-center gap-2 rounded-2xl bg-cyan-400 px-5 py-2 font-bold text-black hover:bg-cyan-300"
                >
                  <User size={16} />
                  Join Arena
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      <main className="relative z-0">
        <Outlet />
      </main>

      <footer className="relative z-0 border-t border-white/10 px-6 py-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-2xl font-black">ArenaOS</h3>
            <p className="mt-2 text-sm text-white/50">
              Realtime Esports Tournament Operating System
            </p>
          </div>

          <div className="flex gap-6 text-sm font-bold text-white/50">
            <Link to="/" className="hover:text-cyan-400">
              Home
            </Link>
            <Link to="/tournaments" className="hover:text-cyan-400">
              Tournaments
            </Link>
            <Link to="/organizer" className="hover:text-cyan-400">
              Organizer
            </Link>
            <Link to="/admin" className="hover:text-cyan-400">
              Admin
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
