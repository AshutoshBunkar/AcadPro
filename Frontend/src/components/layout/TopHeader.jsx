import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Menu,
  Bell,
  Moon,
  Sun,
  User,
  LogOut,
  ChevronDown,
  GraduationCap,
  Shield,
  Check,
  CheckCheck,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Inbox,
  ExternalLink,
  Video,
} from "lucide-react";
import { useAuth } from "../../context/useAuth";
import { ROLES, DASHBOARD_PATH } from "../../constants";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  clearNotification,
  clearAllNotifications,
} from "../../api/notifications";
import { getErrorMessage } from "../../api/axios";

export default function TopHeader({
  darkMode,
  onToggleTheme,
  setMobileOpen,
  title,
  subtitle,
}) {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  const notifRef = useRef(null);
  const profileRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotificationsOpen(false);
        setConfirmClearAll(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileMenuOpen(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key !== "Escape") return;
      for (const menu of [notifRef.current, profileRef.current]) {
        const trigger = menu?.querySelector('button[aria-expanded="true"]');
        if (trigger) trigger.focus();
      }
      setNotificationsOpen(false);
      setProfileMenuOpen(false);
      setConfirmClearAll(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  // Notifications Query
  const { data: notifData, isLoading: notifLoading } = useQuery({
    queryKey: ["user-notifications"],
    queryFn: getNotifications,
    select: (res) => res.data?.data,
    enabled: Boolean(user),
    refetchInterval: 30000,
  });

  const notifications = notifData?.notifications || [];
  const unreadCount = notifData?.unreadCount ?? notifications.filter((n) => !n.isRead).length;

  const showFeedback = (type, text) => {
    setFeedbackMessage({ type, text });
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  // Mark Single Notification as Read
  const markReadMutation = useMutation({
    mutationFn: (id) => markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-notifications"] });
    },
    onError: (err) => {
      showFeedback("error", getErrorMessage(err));
    },
  });

  // Mark All Notifications as Read
  const markAllReadMutation = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-notifications"] });
      showFeedback("success", "All notifications marked as read");
    },
    onError: (err) => {
      showFeedback("error", getErrorMessage(err));
    },
  });

  // Clear Single Notification
  const clearOneMutation = useMutation({
    mutationFn: (id) => clearNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-notifications"] });
      showFeedback("success", "Notification cleared");
    },
    onError: (err) => {
      showFeedback("error", getErrorMessage(err));
    },
  });

  // Clear All Notifications
  const clearAllMutation = useMutation({
    mutationFn: () => clearAllNotifications(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-notifications"] });
      setConfirmClearAll(false);
      showFeedback("success", "All notifications cleared successfully");
    },
    onError: (err) => {
      setConfirmClearAll(false);
      showFeedback("error", getErrorMessage(err));
    },
  });

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const getRoleBadge = () => {
    if (role === ROLES.ADMIN) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-nav-highlight/15 text-nav-highlight border border-nav-highlight/30 uppercase tracking-wider">
          Admin
        </span>
      );
    }
    if (role === ROLES.FACULTY) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-nav-accent/15 text-nav-accent border border-nav-accent/30 uppercase tracking-wider">
          Faculty
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-nav-accent/15 text-nav-accent border border-nav-accent/30 uppercase tracking-wider">
        Student
      </span>
    );
  };

  const formatTimestamp = (dateStr) => {
    if (!dateStr) return "Just now";
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch {
      return "Recent";
    }
  };

  return (
    <header className="portal-nav sticky top-0 z-30 h-16 bg-nav-canvas/85 backdrop-blur-xl border-b border-nav-line transition-all">
      <div className="flex items-center justify-between h-full px-4 sm:px-6 lg:px-8">
        {/* Left Side: Mobile Menu Button + Breadcrumb/Page Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden p-2 rounded-xl text-nav-muted hover:text-nav-ink hover:bg-nav-subtle transition-colors focus-visible:ring-2 focus-visible:ring-nav-accent"
            aria-label="Open mobile menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Mobile brand when sidebar is hidden */}
          <Link
            to={DASHBOARD_PATH[role] || "/login"}
            className="md:hidden flex items-center gap-2"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-nav-accent/25 to-nav-highlight/25 border border-nav-accent/40 flex items-center justify-center text-nav-accent">
              <GraduationCap className="w-4 h-4 text-nav-accent" />
            </div>
            <span className="font-display font-extrabold text-lg tracking-tight text-nav-ink">
              Acad<span className="text-nav-accent">Pro</span>
            </span>
          </Link>

          {/* Desktop Title & Section */}
          <div className="hidden md:block min-w-0">
            {title ? (
              <div>
                <h1 className="text-sm font-bold text-nav-ink tracking-tight">
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-[11px] text-nav-muted truncate">{subtitle}</p>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-nav-muted">
                <span className="font-semibold text-nav-ink">
                  AcadPro Academic Platform
                </span>
                <span>•</span>
                <span className="text-nav-accent">
                  {role === ROLES.ADMIN
                    ? "Central Administration"
                    : role === ROLES.FACULTY
                    ? "Instructor Portal"
                    : "Student Library"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Campus Badge + Notifications + User Menu */}
        <div className="flex items-center gap-2 sm:gap-3">
          {role === ROLES.ADMIN && (
            <button type="button" onClick={onToggleTheme} aria-label="Dark mode"
              aria-pressed={darkMode} title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              className="grid h-11 w-11 place-items-center rounded-xl text-nav-accent hover:bg-nav-subtle focus-visible:ring-2 focus-visible:ring-nav-accent">
              {darkMode ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
            </button>
          )}
          {/* Notification Bell */}
          <div className="relative" ref={notifRef}>
            <button
              aria-expanded={notificationsOpen}
              onClick={() => {
                setNotificationsOpen(!notificationsOpen);
                setConfirmClearAll(false);
              }}
              className="relative p-2 rounded-xl text-nav-muted hover:text-nav-ink hover:bg-nav-subtle transition-colors focus-visible:ring-2 focus-visible:ring-nav-accent"
              aria-label="View notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-nav-highlight text-nav-canvas font-bold text-[10px] ring-2 ring-nav-canvas animate-in zoom-in">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Popover */}
            {notificationsOpen && (
              <div className="fixed inset-x-3 top-16 sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-96 rounded-2xl bg-nav-surface border border-nav-line shadow-2xl p-4 z-50 text-nav-ink animate-in fade-in zoom-in-95 duration-150">
                {/* Popover Header */}
                <div className="flex items-center justify-between pb-3 border-b border-nav-line mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">Notifications</span>
                    {unreadCount > 0 ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-nav-highlight/20 text-nav-highlight">
                        {unreadCount} new
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-nav-success/20 text-nav-success">
                        Caught up
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Mark All Read Button */}
                    {unreadCount > 0 && (
                      <button
                        onClick={() => markAllReadMutation.mutate()}
                        disabled={markAllReadMutation.isPending}
                        title="Mark all notifications as read"
                        className="text-[11px] text-nav-accent hover:underline flex items-center gap-1 disabled:opacity-50"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span>Mark read</span>
                      </button>
                    )}

                    {/* Clear All Button */}
                    {notifications.length > 0 && !confirmClearAll && (
                      <button
                        onClick={() => setConfirmClearAll(true)}
                        disabled={clearAllMutation.isPending}
                        title="Clear all notifications"
                        className="text-[11px] text-nav-muted hover:text-nav-highlight flex items-center gap-1 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Clear All</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Clear All Confirmation Banner */}
                {confirmClearAll && (
                  <div className="mb-3 p-3 rounded-xl bg-nav-highlight/10 border border-nav-highlight/30 text-xs space-y-2 animate-in fade-in">
                    <div className="flex items-center gap-2 text-nav-highlight font-semibold">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <span>Clear all active notifications?</span>
                    </div>
                    <p className="text-[11px] text-nav-muted leading-relaxed">
                      This will remove all notifications from your active list. Underlying academic records remain intact.
                    </p>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={() => setConfirmClearAll(false)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-nav-muted hover:text-nav-ink"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => clearAllMutation.mutate()}
                        disabled={clearAllMutation.isPending}
                        className="px-3 py-1 rounded-lg text-[11px] font-bold bg-nav-highlight text-nav-canvas hover:bg-nav-highlight/90 transition-colors shadow-sm disabled:opacity-50"
                      >
                        {clearAllMutation.isPending ? "Clearing..." : "Yes, Clear All"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Feedback Toast Banner */}
                {feedbackMessage && (
                  <div
                    className={`mb-3 p-2.5 rounded-xl text-xs flex items-center gap-2 animate-in fade-in ${
                      feedbackMessage.type === "success"
                        ? "bg-nav-success/15 border border-nav-success/30 text-nav-success-ink"
                        : "bg-nav-danger/15 border border-nav-danger/30 text-nav-danger-ink"
                    }`}
                  >
                    {feedbackMessage.type === "success" ? (
                      <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    )}
                    <span className="flex-1 text-[11px]">{feedbackMessage.text}</span>
                  </div>
                )}

                {/* Notification List */}
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {notifLoading ? (
                    <div className="p-8 text-center text-xs text-nav-muted space-y-2">
                      <div className="w-5 h-5 mx-auto border-2 border-nav-accent border-t-transparent rounded-full animate-spin"></div>
                      <p>Loading notifications...</p>
                    </div>
                  ) : notifications.length === 0 ? (
                    /* Clean Empty State */
                    <div className="p-8 text-center space-y-2.5">
                      <div className="w-10 h-10 mx-auto rounded-2xl bg-nav-subtle border border-nav-line flex items-center justify-center text-nav-accent">
                        <Inbox className="w-5 h-5" />
                      </div>
                      <h4 className="text-xs font-bold text-nav-ink">All Caught Up!</h4>
                      <p className="text-[11px] text-nav-muted max-w-[220px] mx-auto leading-relaxed">
                        You have no unread or pending notifications in your academic feed.
                      </p>
                    </div>
                  ) : (
                    notifications.map((notif) => {
                      const isUnread = !notif.isRead;
                      return (
                        <div
                          key={notif._id}
                          className={`group relative p-3 rounded-xl border transition-all duration-150 ${
                            isUnread
                              ? "bg-nav-subtle/90 border-nav-accent/35 shadow-sm shadow-nav-accent/5"
                              : "bg-nav-row/70 border-nav-line hover:border-nav-line/80 opacity-85 hover:opacity-100"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                              {isUnread && (
                                <span className="w-2 h-2 rounded-full bg-nav-accent flex-shrink-0 animate-pulse" />
                              )}
                              <span
                                className={`text-xs font-semibold truncate ${
                                  isUnread ? "text-nav-accent" : "text-nav-ink"
                                }`}
                              >
                                {notif.title}
                              </span>
                            </div>

                            <span className="text-[10px] text-nav-muted flex-shrink-0">
                              {formatTimestamp(notif.createdAt)}
                            </span>
                          </div>

                          <p className="text-xs text-nav-muted leading-relaxed mb-2">
                            {notif.message}
                          </p>

                          {/* Action Footer: Link + Mark Read + Clear */}
                          <div className="flex items-center justify-between pt-1 border-t border-nav-line/50 text-[11px]">
                            {notif.link ? (
                              <button
                                onClick={() => {
                                  if (isUnread) markReadMutation.mutate(notif._id);
                                  setNotificationsOpen(false);
                                  navigate(notif.link);
                                }}
                                className="text-nav-accent hover:underline flex items-center gap-1 font-medium"
                              >
                                <span>View Details</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            ) : (
                              <span className="text-[10px] text-nav-muted/60 uppercase font-mono">
                                {notif.type || "INFO"}
                              </span>
                            )}

                            <div className="flex items-center gap-1.5 opacity-90 group-hover:opacity-100">
                              {/* Mark as read individual button */}
                              {isUnread && (
                                <button
                                  onClick={() => markReadMutation.mutate(notif._id)}
                                  disabled={markReadMutation.isPending}
                                  title="Mark as read"
                                  className="p-1 rounded-lg text-nav-muted hover:text-nav-success hover:bg-nav-success/10 transition-colors"
                                  aria-label="Mark notification as read"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Clear individual button */}
                              <button
                                onClick={() => clearOneMutation.mutate(notif._id)}
                                disabled={clearOneMutation.isPending}
                                title="Clear notification"
                                className="p-1 rounded-lg text-nav-muted hover:text-nav-highlight hover:bg-nav-highlight/10 transition-colors"
                                aria-label="Clear notification"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Pill & Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="flex items-center gap-2.5 p-1.5 pr-2.5 rounded-full bg-nav-surface hover:bg-nav-subtle border border-nav-line transition-colors focus-visible:ring-2 focus-visible:ring-nav-accent"
              aria-expanded={profileMenuOpen}
              aria-label="User account menu"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-nav-accent/25 to-nav-highlight/25 border border-nav-accent/40 flex items-center justify-center text-nav-accent font-bold text-xs flex-shrink-0">
                {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
              </div>
              <span className="hidden md:block text-xs font-semibold text-nav-ink max-w-[120px] truncate">
                {user?.name || "My Account"}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-nav-muted" />
            </button>

            {/* Profile Menu Dropdown */}
            {profileMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-nav-surface border border-nav-line shadow-2xl p-3 z-50 text-nav-ink animate-in fade-in zoom-in-95 duration-150">
                {/* User Summary Header */}
                <div className="p-2.5 rounded-xl bg-nav-subtle/70 border border-nav-line mb-2">
                  <p className="text-xs font-bold text-nav-ink truncate">
                    {user?.name}
                  </p>
                  <p className="text-[11px] text-nav-muted truncate mb-2">
                    {user?.email}
                  </p>
                  <div className="flex items-center justify-between">
                    {getRoleBadge()}
                    {user?.mis && (
                      <span className="text-[10px] font-mono text-nav-muted">
                        MIS: {user.mis}
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick Links */}
                <div className="space-y-1">
                  {role === ROLES.FACULTY && (
                    <>
                      <Link
                        to="/faculty/lectures"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-nav-muted hover:text-nav-ink hover:bg-nav-subtle transition-colors"
                      >
                        <Video className="w-4 h-4 text-nav-accent" />
                        <span>My Uploaded Lectures</span>
                      </Link>
                      <Link
                        to="/faculty/profile"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-nav-muted hover:text-nav-ink hover:bg-nav-subtle transition-colors"
                      >
                        <User className="w-4 h-4 text-nav-accent" />
                        <span>Profile & Office Hours</span>
                      </Link>
                    </>
                  )}
                  {role === ROLES.ADMIN && (
                    <Link
                      to="/admin/profile"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-nav-muted hover:text-nav-ink hover:bg-nav-subtle transition-colors"
                    >
                      <Shield className="w-4 h-4 text-nav-accent" />
                      <span>Admin Security Credentials</span>
                    </Link>
                  )}
                </div>

                {/* Logout Action */}
                <div className="mt-2 pt-2 border-t border-nav-line">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-nav-danger hover:bg-nav-danger/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out of AcadPro</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
