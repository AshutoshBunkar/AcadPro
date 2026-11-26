import { useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import {
  LayoutDashboard,
  Upload,
  User,
  Shield,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
  BookOpen,
  GraduationCap,
  Sparkles,
  Video,
} from "lucide-react";
import { useAuth } from "../../context/useAuth";
import { ROLES, DASHBOARD_PATH } from "../../constants";

export default function Sidebar({
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
}) {
  const { user, role, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Close mobile drawer on route change
  useEffect(() => {
    if (mobileOpen) {
      setMobileOpen(false);
    }
  }, [location.pathname, mobileOpen, setMobileOpen]);

  // Handle escape key to close mobile drawer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && mobileOpen) {
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen, setMobileOpen]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  // Build navigation items based on role
  const getNavSections = () => {
    if (role === ROLES.ADMIN) {
      return [
        {
          title: "Central Command",
          items: [
            {
              label: "Dashboard",
              path: "/admin/dashboard",
              icon: LayoutDashboard,
              description: "Semesters, directory & analytics",
            },
            {
              label: "Security & Profile",
              path: "/admin/profile",
              icon: Shield,
              description: "Audit logs & master keys",
            },
          ],
        },
      ];
    }

    if (role === ROLES.FACULTY) {
      return [
        {
          title: "Teaching Hub",
          items: [
            {
              label: "My Subjects",
              path: "/faculty/dashboard",
              icon: BookOpen,
              description: "Assigned courses & modules",
            },
            {
              label: "My Lectures",
              path: "/faculty/lectures",
              icon: Video,
              description: "Manage recordings & Q&A",
            },
            {
              label: "Upload Lecture",
              path: "/faculty/upload",
              icon: Upload,
              badge: "New",
              badgeColor: "neon",
              description: "Publish video material",
            },
            {
              label: "Faculty Profile",
              path: "/faculty/profile",
              icon: User,
              description: "Bio, office hours & credentials",
            },
          ],
        },
      ];
    }

    // Default: Student
    return [
      {
        title: "Academic Hub",
        items: [
          {
            label: "Course Library",
            path: "/dashboard",
            icon: LayoutDashboard,
            description: "Current & archived semesters",
          },
        ],
      },
    ];
  };

  const navSections = getNavSections();

  const getRoleLabel = () => {
    if (role === ROLES.ADMIN) return "Administrator";
    if (role === ROLES.FACULTY) return "Faculty Member";
    return "Student";
  };

  const getRoleBadgeStyle = () => {
    if (role === ROLES.ADMIN) return "bg-[#FF3D9A]/15 text-[#FF3D9A] border-[#FF3D9A]/30";
    if (role === ROLES.FACULTY) return "bg-[#75D7FF]/15 text-[#75D7FF] border-[#75D7FF]/30";
    return "bg-[#75D7FF]/15 text-[#75D7FF] border-[#75D7FF]/30";
  };

  // Nav Item Renderer
  const renderNavItem = (item) => {
    const Icon = item.icon;
    const isActive =
      location.pathname === item.path ||
      (item.path !== "/dashboard" &&
        item.path !== "/faculty/dashboard" &&
        item.path !== "/admin/dashboard" &&
        location.pathname.startsWith(item.path));

    return (
      <Link
        key={item.path}
        to={item.path}
        title={collapsed ? item.label : undefined}
        className={`group relative flex items-center gap-3.5 px-3.5 py-3 rounded-xl font-medium text-sm transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[#75D7FF] ${
          isActive
            ? "bg-[#75D7FF]/10 text-[#F5F3EF] border-l-4 border-[#75D7FF] shadow-[0_0_15px_-3px_rgba(117,215,255,0.15)] font-semibold"
            : "text-[#A4ADBA] hover:text-[#F5F3EF] hover:bg-[#191E28]/70 border-l-4 border-transparent"
        } ${collapsed ? "justify-center px-0 py-3" : ""}`}
      >
        <div
          className={`flex items-center justify-center transition-colors ${
            isActive
              ? "text-[#75D7FF]"
              : "text-[#A4ADBA] group-hover:text-[#75D7FF]"
          }`}
        >
          <Icon className="w-5 h-5 flex-shrink-0" />
        </div>

        {!collapsed && (
          <div className="flex items-center justify-between flex-1 min-w-0">
            <span className="truncate">{item.label}</span>
            {item.badge && (
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  item.badgeColor === "neon"
                    ? "bg-[#FF3D9A]/20 text-[#FF3D9A] border border-[#FF3D9A]/30"
                    : "bg-[#75D7FF]/20 text-[#75D7FF] border border-[#75D7FF]/30"
                }`}
              >
                {item.badge}
              </span>
            )}
          </div>
        )}

        {/* Collapsed Tooltip on Hover */}
        {collapsed && (
          <div className="absolute left-full ml-3 px-3 py-1.5 bg-[#191E28] border border-[#292F3B] text-[#F5F3EF] text-xs font-semibold rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50 whitespace-nowrap">
            {item.label}
          </div>
        )}
      </Link>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#11141B] border-r border-[#292F3B] select-none text-[#F5F3EF]">
      {/* Brand Header */}
      <div
        className={`flex items-center justify-between h-20 px-5 border-b border-[#292F3B] ${
          collapsed ? "justify-center px-2" : ""
        }`}
      >
        <Link
          to={DASHBOARD_PATH[role] || "/login"}
          className="flex items-center gap-3 group outline-none"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#75D7FF]/25 to-[#FF3D9A]/25 border border-[#75D7FF]/40 flex items-center justify-center text-[#75D7FF] shadow-[0_0_20px_-5px_rgba(117,215,255,0.3)] group-hover:scale-105 transition-transform flex-shrink-0">
            <GraduationCap className="w-5 h-5 text-[#75D7FF]" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-display font-extrabold text-xl tracking-tight text-[#F5F3EF]">
                  Acade<span className="text-[#75D7FF]">X</span>
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF3D9A] animate-pulse"></span>
              </div>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-[#A4ADBA] truncate">
                Academic Platform
              </p>
            </div>
          )}
        </Link>

        {/* Close button for mobile drawer */}
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden p-1.5 rounded-lg text-[#A4ADBA] hover:text-[#F5F3EF] hover:bg-[#191E28] transition-colors"
          aria-label="Close navigation drawer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3.5 py-6 space-y-6">
        {navSections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-1.5">
            {!collapsed && (
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#A4ADBA]/60 mb-2">
                {section.title}
              </p>
            )}
            <div className="space-y-1">
              {section.items.map((item) => renderNavItem(item))}
            </div>
          </div>
        ))}

        {/* Context / Quick Info Card when expanded */}
        {!collapsed && user && (
          <div className="pt-2">
            <div className="p-3.5 rounded-xl bg-[#191E28]/60 border border-[#292F3B] text-xs">
              <div className="flex items-center gap-2 mb-1.5 text-[#75D7FF]">
                <Sparkles className="w-3.5 h-3.5" />
                <span className="font-semibold text-[11px] uppercase tracking-wider">
                  Campus Session
                </span>
              </div>
              <p className="text-[#A4ADBA] text-[11px] leading-relaxed">
                {user.department ? `${user.department} Department` : "IIIT Pune"}
                {user.year ? ` • Year ${user.year}` : ""}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer / User Profile & Collapse Toggle */}
      <div className="p-3.5 border-t border-[#292F3B] bg-[#0E1117] space-y-2">
        {/* User Card */}
        <div
          className={`flex items-center gap-3 p-2 rounded-xl transition-colors ${
            collapsed ? "justify-center p-1" : "bg-[#191E28]/50 border border-[#292F3B]"
          }`}
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#75D7FF]/20 to-[#FF3D9A]/20 border border-[#75D7FF]/30 flex items-center justify-center text-[#75D7FF] font-bold text-sm flex-shrink-0 overflow-hidden">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name || "User"}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <span>{user?.name ? user.name.charAt(0).toUpperCase() : "U"}</span>
            )}
          </div>

          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-[#F5F3EF] truncate leading-tight">
                {user?.name || "AcadPro User"}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${getRoleBadgeStyle()}`}
                >
                  {getRoleLabel()}
                </span>
              </div>
            </div>
          )}

          {!collapsed && (
            <button
              onClick={handleLogout}
              title="Sign out"
              className="p-1.5 rounded-lg text-[#A4ADBA] hover:text-[#F43F5E] hover:bg-[#F43F5E]/10 transition-colors"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Collapsed mode Sign Out button */}
        {collapsed && (
          <button
            onClick={handleLogout}
            title="Sign out"
            className="w-full flex items-center justify-center p-2 rounded-xl text-[#A4ADBA] hover:text-[#F43F5E] hover:bg-[#F43F5E]/10 transition-colors"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}

        {/* Desktop Collapse Toggle Button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex w-full items-center justify-center gap-2 py-1.5 px-2 rounded-lg text-xs font-medium text-[#A4ADBA] hover:text-[#F5F3EF] hover:bg-[#191E28] transition-colors border border-transparent hover:border-[#292F3B]"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4 text-[#75D7FF]" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4 text-[#75D7FF]" />
              <span className="text-[11px]">Collapse Navigation</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <aside
        className={`hidden md:block fixed left-0 top-0 bottom-0 z-40 transition-all duration-300 ease-in-out ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer (Responsive slide-out) */}
      <div
        className={`md:hidden fixed inset-0 z-50 transition-visibility duration-300 ${
          mobileOpen ? "visible" : "invisible"
        }`}
      >
        {/* Backdrop overlay */}
        <div
          onClick={() => setMobileOpen(false)}
          className={`fixed inset-0 bg-[#08090D]/80 backdrop-blur-sm transition-opacity duration-300 ${
            mobileOpen ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Drawer slide-in container */}
        <div
          className={`fixed left-0 top-0 bottom-0 w-72 max-w-[85vw] shadow-2xl transition-transform duration-300 ease-out z-10 ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {sidebarContent}
        </div>
      </div>
    </>
  );
}
