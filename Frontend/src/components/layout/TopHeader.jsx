import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Menu,
  Bell,
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
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FF3D9A]/15 text-[#FF3D9A] border border-[#FF3D9A]/30 uppercase tracking-wider">
          Admin
        </span>
      );
    }
    if (role === ROLES.FACULTY) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#75D7FF]/15 text-[#75D7FF] border border-[#75D7FF]/30 uppercase tracking-wider">
          Faculty
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#75D7FF]/15 text-[#75D7FF] border border-[#75D7FF]/30 uppercase tracking-wider">
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
    <header className="sticky top-0 z-30 h-16 bg-[#08090D]/85 backdrop-blur-xl border-b border-[#292F3B] transition-all">
      <div className="flex items-center justify-between h-full px-4 sm:px-6 lg:px-8">
        {/* Left Side: Mobile Menu Button + Breadcrumb/Page Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden p-2 rounded-xl text-[#A4ADBA] hover:text-[#F5F3EF] hover:bg-[#191E28] transition-colors focus-visible:ring-2 focus-visible:ring-[#75D7FF]"
            aria-label="Open mobile menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Mobile brand when sidebar is hidden */}
          <Link
            to={DASHBOARD_PATH[role] || "/login"}
            className="md:hidden flex items-center gap-2"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#75D7FF]/25 to-[#FF3D9A]/25 border border-[#75D7FF]/40 flex items-center justify-center text-[#75D7FF]">
              <GraduationCap className="w-4 h-4 text-[#75D7FF]" />
            </div>
            <span className="font-display font-extrabold text-lg tracking-tight text-[#F5F3EF]">
              Acade<span className="text-[#75D7FF]">X</span>
            </span>
          </Link>

          {/* Desktop Title & Section */}
          <div className="hidden sm:block">
            {title ? (
              <div>
                <h1 className="text-sm font-bold text-[#F5F3EF] tracking-tight">
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-[11px] text-[#A4ADBA] truncate">{subtitle}</p>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-[#A4ADBA]">
                <span className="font-semibold text-[#F5F3EF]">
                  AcadPro Academic Platform
                </span>
                <span>•</span>
                <span className="text-[#75D7FF]">
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
          {/* Institutional Status Badge */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-[#11141B] border border-[#292F3B] text-xs">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
            <span className="text-[#A4ADBA]">Academic Session:</span>
            <span className="font-semibold text-[#75D7FF]">AY 2026-2027</span>
          </div>

          {/* Notification Bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => {
                setNotificationsOpen(!notificationsOpen);
                setConfirmClearAll(false);
              }}
              className="relative p-2 rounded-xl text-[#A4ADBA] hover:text-[#F5F3EF] hover:bg-[#191E28] transition-colors focus-visible:ring-2 focus-visible:ring-[#75D7FF]"
              aria-label="View notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-[#FF3D9A] text-[#08090D] font-bold text-[10px] ring-2 ring-[#08090D] animate-in zoom-in">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Popover */}
            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-[#11141B] border border-[#292F3B] shadow-2xl p-4 z-50 text-[#F5F3EF] animate-in fade-in zoom-in-95 duration-150">
                {/* Popover Header */}
                <div className="flex items-center justify-between pb-3 border-b border-[#292F3B] mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">Notifications</span>
                    {unreadCount > 0 ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FF3D9A]/20 text-[#FF3D9A]">
                        {unreadCount} new
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#10B981]/20 text-[#10B981]">
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
                        className="text-[11px] text-[#75D7FF] hover:underline flex items-center gap-1 disabled:opacity-50"
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
                        className="text-[11px] text-[#A4ADBA] hover:text-[#FF3D9A] flex items-center gap-1 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Clear All</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Clear All Confirmation Banner */}
                {confirmClearAll && (
                  <div className="mb-3 p-3 rounded-xl bg-[#FF3D9A]/10 border border-[#FF3D9A]/30 text-xs space-y-2 animate-in fade-in">
                    <div className="flex items-center gap-2 text-[#FF3D9A] font-semibold">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <span>Clear all active notifications?</span>
                    </div>
                    <p className="text-[11px] text-[#A4ADBA] leading-relaxed">
                      This will remove all notifications from your active list. Underlying academic records remain intact.
                    </p>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={() => setConfirmClearAll(false)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-[#A4ADBA] hover:text-[#F5F3EF]"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => clearAllMutation.mutate()}
                        disabled={clearAllMutation.isPending}
                        className="px-3 py-1 rounded-lg text-[11px] font-bold bg-[#FF3D9A] text-[#08090D] hover:bg-[#FF3D9A]/90 transition-colors shadow-sm disabled:opacity-50"
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
                        ? "bg-[#10B981]/15 border border-[#10B981]/30 text-[#6EE7B7]"
                        : "bg-[#F43F5E]/15 border border-[#F43F5E]/30 text-[#FDA4AF]"
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
                    <div className="p-8 text-center text-xs text-[#A4ADBA] space-y-2">
                      <div className="w-5 h-5 mx-auto border-2 border-[#75D7FF] border-t-transparent rounded-full animate-spin"></div>
                      <p>Loading notifications...</p>
                    </div>
                  ) : notifications.length === 0 ? (
                    /* Clean Empty State */
                    <div className="p-8 text-center space-y-2.5">
                      <div className="w-10 h-10 mx-auto rounded-2xl bg-[#191E28] border border-[#292F3B] flex items-center justify-center text-[#75D7FF]">
                        <Inbox className="w-5 h-5" />
                      </div>
                      <h4 className="text-xs font-bold text-[#F5F3EF]">All Caught Up!</h4>
                      <p className="text-[11px] text-[#A4ADBA] max-w-[220px] mx-auto leading-relaxed">
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
                              ? "bg-[#191E28]/90 border-[#75D7FF]/35 shadow-sm shadow-[#75D7FF]/5"
                              : "bg-[#141820]/70 border-[#292F3B] hover:border-[#292F3B]/80 opacity-85 hover:opacity-100"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                              {isUnread && (
                                <span className="w-2 h-2 rounded-full bg-[#75D7FF] flex-shrink-0 animate-pulse" />
                              )}
                              <span
                                className={`text-xs font-semibold truncate ${
                                  isUnread ? "text-[#75D7FF]" : "text-[#F5F3EF]"
                                }`}
                              >
                                {notif.title}
                              </span>
                            </div>

                            <span className="text-[10px] text-[#A4ADBA] flex-shrink-0">
                              {formatTimestamp(notif.createdAt)}
                            </span>
                          </div>

                          <p className="text-xs text-[#A4ADBA] leading-relaxed mb-2">
                            {notif.message}
                          </p>

                          {/* Action Footer: Link + Mark Read + Clear */}
                          <div className="flex items-center justify-between pt-1 border-t border-[#292F3B]/50 text-[11px]">
                            {notif.link ? (
                              <button
                                onClick={() => {
                                  if (isUnread) markReadMutation.mutate(notif._id);
                                  setNotificationsOpen(false);
                                  navigate(notif.link);
                                }}
                                className="text-[#75D7FF] hover:underline flex items-center gap-1 font-medium"
                              >
                                <span>View Details</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            ) : (
                              <span className="text-[10px] text-[#A4ADBA]/60 uppercase font-mono">
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
                                  className="p-1 rounded-lg text-[#A4ADBA] hover:text-[#10B981] hover:bg-[#10B981]/10 transition-colors"
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
                                className="p-1 rounded-lg text-[#A4ADBA] hover:text-[#FF3D9A] hover:bg-[#FF3D9A]/10 transition-colors"
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
              className="flex items-center gap-2.5 p-1.5 pr-2.5 rounded-full bg-[#11141B] hover:bg-[#191E28] border border-[#292F3B] transition-colors focus-visible:ring-2 focus-visible:ring-[#75D7FF]"
              aria-label="User account menu"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#75D7FF]/25 to-[#FF3D9A]/25 border border-[#75D7FF]/40 flex items-center justify-center text-[#75D7FF] font-bold text-xs flex-shrink-0">
                {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
              </div>
              <span className="hidden md:block text-xs font-semibold text-[#F5F3EF] max-w-[120px] truncate">
                {user?.name || "My Account"}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-[#A4ADBA]" />
            </button>

            {/* Profile Menu Dropdown */}
            {profileMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#11141B] border border-[#292F3B] shadow-2xl p-3 z-50 text-[#F5F3EF] animate-in fade-in zoom-in-95 duration-150">
                {/* User Summary Header */}
                <div className="p-2.5 rounded-xl bg-[#191E28]/70 border border-[#292F3B] mb-2">
                  <p className="text-xs font-bold text-[#F5F3EF] truncate">
                    {user?.name}
                  </p>
                  <p className="text-[11px] text-[#A4ADBA] truncate mb-2">
                    {user?.email}
                  </p>
                  <div className="flex items-center justify-between">
                    {getRoleBadge()}
                    {user?.mis && (
                      <span className="text-[10px] font-mono text-[#A4ADBA]">
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
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[#A4ADBA] hover:text-[#F5F3EF] hover:bg-[#191E28] transition-colors"
                      >
                        <Video className="w-4 h-4 text-[#75D7FF]" />
                        <span>My Uploaded Lectures</span>
                      </Link>
                      <Link
                        to="/faculty/profile"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[#A4ADBA] hover:text-[#F5F3EF] hover:bg-[#191E28] transition-colors"
                      >
                        <User className="w-4 h-4 text-[#75D7FF]" />
                        <span>Profile & Office Hours</span>
                      </Link>
                    </>
                  )}
                  {role === ROLES.ADMIN && (
                    <Link
                      to="/admin/profile"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[#A4ADBA] hover:text-[#F5F3EF] hover:bg-[#191E28] transition-colors"
                    >
                      <Shield className="w-4 h-4 text-[#75D7FF]" />
                      <span>Admin Security Credentials</span>
                    </Link>
                  )}
                </div>

                {/* Logout Action */}
                <div className="mt-2 pt-2 border-t border-[#292F3B]">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#F43F5E] hover:bg-[#F43F5E]/10 transition-colors"
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
