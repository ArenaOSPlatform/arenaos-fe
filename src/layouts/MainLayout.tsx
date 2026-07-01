import { useEffect, useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  ClipboardCheck,
  Code2,
  Loader2,
  LogOut,
  Menu,
  MessageCircle,
  Radio,
  Shield,
  Sword,
  Trophy,
  User,
  UserCheck,
  Users,
  X,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { getMe, logout } from "@/services/auth.service";
import { authSessionExpiredEvent, clearAuthStorage } from "@/services/api";
import {
  getMyNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/services/notification.service";
import { connectSocket, socket } from "@/sockets/socket";
import { acceptTeamInvite, rejectTeamInvite } from "@/services/team.service";
import { getCurrentUserRole, setStoredUserRole } from "@/routes/route-role";
import { EmptyState } from "@/components/ui/EmptyState";
import { ModeToggle } from "@/components/ui/ModeToggle";
import { useConfirm } from "@/hooks/useConfirm";
import { useToast } from "@/hooks/useToast";
import { getAccessToken } from "@/utils/authStorage";

type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  metadata: string | null;
};

const UI = {
  motion: {
    duration: 0.24,
    ease: [0.22, 1, 0.36, 1],
  },
} as const;

function NavLinkItem({
  to,
  children,
  onClick,
  exact = false,
}: {
  to: string;
  children: React.ReactNode;
  onClick?: () => void;
  exact?: boolean;
}) {
  const location = useLocation();
  const isActive = exact
    ? location.pathname === to
    : to === "/"
      ? location.pathname === "/"
      : location.pathname.startsWith(to);

  return (
    <Link
      to={to}
      onClick={onClick}
      className={[
        "inline-flex min-h-10 items-center gap-2 rounded-2xl px-3 text-sm font-black transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050816]",
        isActive
          ? "bg-cyan-300/10 text-cyan-200 border border-cyan-300/20"
          : "text-slate-400 hover:bg-white/[0.06] hover:text-cyan-200",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}

function HeaderButton({
  children,
  onClick,
  className = "",
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={[
        "inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] px-4 text-sm font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:bg-white/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050816] active:translate-y-0",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function NotificationItem({
  item,
  actionId,
  onRead,
  onAccept,
  onReject,
}: {
  item: Notification;
  actionId: string | null;
  onRead: (id: string) => void;
  onAccept: (notification: Notification) => void;
  onReject: (notification: Notification) => void;
}) {
  const isHandling = actionId === item.id;

  return (
    <article
      className={[
        "rounded-2xl border p-4 text-left transition duration-200",
        item.isRead
          ? "border-white/10 bg-black/25 opacity-70"
          : "border-cyan-300/20 bg-cyan-300/10 shadow-[0_0_40px_rgba(34,211,238,0.08)]",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={() => onRead(item.id)}
        className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
      >
        <p className="font-black text-white">{item.title}</p>
        <p className="mt-1 text-sm leading-6 text-slate-400">{item.message}</p>

        <div className="mt-3 flex items-center justify-between gap-3 text-xs">
          <p className="font-black uppercase tracking-[0.14em] text-cyan-200">
            {item.type}
          </p>

          <span
            className={[
              "rounded-full px-2.5 py-1 font-black",
              item.isRead
                ? "bg-white/10 text-slate-400"
                : "bg-emerald-400/15 text-emerald-300",
            ].join(" ")}
          >
            {item.isRead ? "Đã đọc" : "Chưa đọc"}
          </span>
        </div>
      </button>

      {item.type === "TEAM_INVITE" && !item.isRead && (
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => onAccept(item)}
            disabled={isHandling}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-cyan-300 px-4 text-xs font-black text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isHandling && <Loader2 className="size-4 animate-spin" />}
            Accept
          </button>

          <button
            type="button"
            onClick={() => onReject(item)}
            disabled={isHandling}
            className="inline-flex min-h-10 items-center rounded-xl bg-red-400 px-4 text-xs font-black text-black transition hover:bg-red-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      )}
    </article>
  );
}

export function MainLayout() {
  const toast = useToast();
  const confirm = useConfirm();
  const shouldReduceMotion = useReducedMotion();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationActionId, setNotificationActionId] = useState<
    string | null
  >(null);
  const [authenticated, setAuthenticated] = useState(() =>
    Boolean(getAccessToken()),
  );

  const location = useLocation();
  const navigate = useNavigate();

  const [prevPathname, setPrevPathname] = useState(location.pathname);

  // Close mobile menu on route change without triggering effect cascade
  if (location.pathname !== prevPathname) {
    setPrevPathname(location.pathname);
    setMobileMenuOpen(false);
    setOpen(false);
  }

  useEffect(() => {
    async function setupNotifications() {
      const token = getAccessToken();
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
        const role = meRes.data.role;

        if (role === "PLAYER" || role === "ORGANIZER" || role === "ADMIN") {
          setStoredUserRole(role);
        }

        connectSocket();

        const notiRes = await getMyNotifications();
        setNotifications(notiRes.data);

        socket.off("notification:new");
        socket.on("notification:new", (data: Notification) => {
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
      setMobileMenuOpen(false);
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
      description:
        "This notification will be marked as handled after rejection.",
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
    setMobileMenuOpen(false);
    toast.info("You have been logged out.");
    navigate("/login");
  }

  // Nav items for reuse in both desktop and mobile
  const navLinks = (
    <>
      <NavLinkItem to="/tournaments">Tournaments</NavLinkItem>



      <NavLinkItem to="/matches/1">
        <Radio className="size-4" />
        Match Room
      </NavLinkItem>

      {userRole === "PLAYER" && (
        <>
          <NavLinkItem to="/team">
            <Users className="size-4" />
            Team
          </NavLinkItem>
          {userRole === "PLAYER" && (
            <NavLinkItem to="/become-organizer">
              <UserCheck className="size-4" />
              Become Organizer
            </NavLinkItem>
          )}
        </>
      )}

      {userRole === "ORGANIZER" && (
        <NavLinkItem to="/organizer">
          <Shield className="size-4" />
          Organizer
        </NavLinkItem>
      )}

      {userRole === "ADMIN" && (
        <>
          <NavLinkItem to="/admin">
            <Sword className="size-4" />
            Admin
          </NavLinkItem>
          <NavLinkItem to="/admin/organizer-requests">
            <UserCheck className="size-4" />
            Organizer Requests
          </NavLinkItem>
          <NavLinkItem to="/admin/tournament-approvals">
            <ClipboardCheck className="size-4" />
            Tournament Approvals
          </NavLinkItem>
        </>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#050816]/80 backdrop-blur-2xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="group flex items-center gap-3 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
          >
            <span className="flex size-11 items-center justify-center rounded-2xl bg-cyan-300 text-slate-950 shadow-[0_18px_50px_rgba(34,211,238,0.22)] transition duration-300 group-hover:shadow-[0_18px_60px_rgba(34,211,238,0.38)]">
              <Trophy className="size-6" />
            </span>
            <span className="text-2xl font-black tracking-[-0.04em]">
              ArenaOS
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center gap-1 lg:flex">
            {navLinks}
          </div>

          <div className="relative flex items-center gap-3">
            <ModeToggle />

            {/* Notification bell */}
            <HeaderButton
              onClick={() => setOpen((prev) => !prev)}
              ariaLabel="Open notifications"
              className="relative size-11 px-0"
            >
              <Bell className="size-5" />

              {unreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-red-400 text-[11px] font-black text-black ring-2 ring-[#050816]"
                >
                  {unreadCount}
                </motion.span>
              )}
            </HeaderButton>

            <AnimatePresence>
              {open && (
                <motion.div
                  initial={
                    shouldReduceMotion
                      ? false
                      : { opacity: 0, y: 12, scale: 0.96, filter: "blur(8px)" }
                  }
                  animate={
                    shouldReduceMotion
                      ? undefined
                      : { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }
                  }
                  exit={
                    shouldReduceMotion
                      ? undefined
                      : { opacity: 0, y: 10, scale: 0.96, filter: "blur(8px)" }
                  }
                  transition={{
                    duration: UI.motion.duration,
                    ease: UI.motion.ease,
                  }}
                  className="absolute right-0 top-14 z-50 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-[2rem] border border-white/10 bg-[#0f172a]/95 p-4 shadow-[0_32px_100px_rgba(0,0,0,0.5)] backdrop-blur-2xl"
                >
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/70 to-transparent" />

                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-black tracking-[-0.03em]">
                        Notifications
                      </h3>
                      <p className="mt-1 text-xs text-slate-400">
                        {unreadCount} unread updates
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={handleReadAllNotifications}
                          className="min-h-9 rounded-xl bg-white/[0.08] px-3 text-xs font-black text-slate-300 transition hover:bg-white/[0.12]"
                        >
                          Mark all
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className="inline-flex size-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-white/10 hover:text-white"
                        aria-label="Close notifications"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  </div>

                  {notifications.length === 0 ? (
                    <EmptyState
                      compact
                      icon={Bell}
                      title="No notifications"
                      description="Invites and match updates will appear here."
                    />
                  ) : (
                    <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
                      {notifications.map((item) => (
                        <NotificationItem
                          key={item.id}
                          item={item}
                          actionId={notificationActionId}
                          onRead={handleReadNotification}
                          onAccept={handleAcceptInvite}
                          onReject={handleRejectInvite}
                        />
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {authenticated ? (
              <>
                <Link
                  to="/profile"
                  className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-3 text-sm font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:bg-white/[0.1] md:px-4"
                >
                  <User className="size-4" />
                  <span className="hidden sm:inline">Profile</span>
                </Link>

                <HeaderButton
                  onClick={handleLogout}
                  className="hidden gap-2 md:inline-flex"
                >
                  <LogOut className="size-4" />
                  Logout
                </HeaderButton>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hidden min-h-11 items-center rounded-2xl border border-white/10 bg-white/[0.06] px-5 text-sm font-black text-white transition hover:bg-white/[0.1] md:inline-flex"
                >
                  Login
                </Link>

                <Link
                  to="/register"
                  className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-cyan-300 px-5 text-sm font-black text-slate-950 shadow-[0_18px_50px_rgba(34,211,238,0.22)] transition hover:-translate-y-0.5 hover:bg-cyan-200"
                >
                  <User className="size-4" />
                  Join Arena
                </Link>
              </>
            )}

            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              className="inline-flex size-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-white transition hover:bg-white/[0.1] lg:hidden"
            >
              <AnimatePresence mode="wait" initial={false}>
                {mobileMenuOpen ? (
                  <motion.span
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <X className="size-5" />
                  </motion.span>
                ) : (
                  <motion.span
                    key="open"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Menu className="size-5" />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        </nav>

        {/* Mobile menu dropdown */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={
                shouldReduceMotion ? false : { opacity: 0, height: 0 }
              }
              animate={
                shouldReduceMotion ? undefined : { opacity: 1, height: "auto" }
              }
              exit={
                shouldReduceMotion ? undefined : { opacity: 0, height: 0 }
              }
              transition={{ duration: 0.22, ease: UI.motion.ease }}
              className="overflow-hidden border-t border-white/10 bg-[#050816]/95 backdrop-blur-2xl lg:hidden"
            >
              <div className="mx-auto flex max-w-7xl flex-col gap-1 px-5 py-4 sm:px-6">
                {navLinks}

                <div className="mt-3 border-t border-white/10 pt-3">
                  {authenticated ? (
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="inline-flex min-h-10 w-full items-center gap-2 rounded-2xl px-3 text-sm font-black text-slate-400 transition hover:bg-white/[0.06] hover:text-red-300"
                    >
                      <LogOut className="size-4" />
                      Logout
                    </button>
                  ) : (
                    <Link
                      to="/login"
                      className="inline-flex min-h-10 w-full items-center gap-2 rounded-2xl px-3 text-sm font-black text-slate-400 transition hover:bg-white/[0.06] hover:text-cyan-200"
                    >
                      <User className="size-4" />
                      Login
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="relative z-0">
        <Outlet />
      </main>

      {/* Enhanced footer */}
      <footer className="relative z-0 border-t border-white/10 bg-[#050816]">
        {/* Top gradient line */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/30 to-transparent" />

        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-10 md:grid-cols-[1fr_auto]">
            {/* Brand */}
            <div>
              <Link
                to="/"
                className="group inline-flex items-center gap-3 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
              >
                <span className="flex size-10 items-center justify-center rounded-xl bg-cyan-300 text-slate-950 shadow-[0_12px_35px_rgba(34,211,238,0.22)] transition duration-300 group-hover:shadow-[0_12px_45px_rgba(34,211,238,0.38)]">
                  <Trophy className="size-5" />
                </span>
                <span className="text-xl font-black tracking-[-0.04em]">
                  ArenaOS
                </span>
              </Link>
              <p className="mt-3 max-w-xs text-sm leading-6 text-slate-500">
                Realtime Esports Tournament Operating System. Built for
                organizers, players, and spectators.
              </p>

              {/* Social links */}
              <div className="mt-5 flex items-center gap-3">
                <a
                  href="#"
                  aria-label="Twitter/X"
                  className="inline-flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-500 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                >
                  <MessageCircle className="size-4" />
                </a>
                <a
                  href="#"
                  aria-label="GitHub"
                  className="inline-flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-500 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                >
                  <Code2 className="size-4" />
                </a>
                <a
                  href="#"
                  aria-label="Discord"
                  className="inline-flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-500 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                >
                  <Zap className="size-4" />
                </a>
              </div>
            </div>

            {/* Links */}
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
              <div>
                <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-slate-600">
                  Platform
                </p>
                <ul className="space-y-2">
                  {[
                    { to: "/", label: "Home" },
                    { to: "/tournaments", label: "Tournaments" },
                    { to: "/matches/1", label: "Match Room" },
                  ].map(({ to, label }) => (
                    <li key={to}>
                      <Link
                        to={to}
                        className="text-sm text-slate-500 transition hover:text-cyan-200"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-slate-600">
                  Account
                </p>
                <ul className="space-y-2">
                  {[
                    { to: "/login", label: "Login" },
                    { to: "/register", label: "Register" },
                    { to: "/profile", label: "Profile" },
                  ].map(({ to, label }) => (
                    <li key={to}>
                      <Link
                        to={to}
                        className="text-sm text-slate-500 transition hover:text-cyan-200"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-slate-600">
                  Admin
                </p>
                <ul className="space-y-2">
                  {[
                    { to: "/organizer", label: "Organizer" },
                    { to: "/admin", label: "Admin Panel" },
                    { to: "/become-organizer", label: "Become Organizer" },
                  ].map(({ to, label }) => (
                    <li key={to}>
                      <Link
                        to={to}
                        className="text-sm text-slate-500 transition hover:text-cyan-200"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-10 flex flex-col gap-3 border-t border-white/[0.07] pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-600">
              © {new Date().getFullYear()} ArenaOS. All rights reserved.
            </p>
            <div className="flex items-center gap-1.5">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-55" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-300" />
              </span>
              <span className="text-xs text-slate-600">Systems operational</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
