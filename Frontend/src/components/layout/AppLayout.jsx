import { useState, useEffect } from "react";
import { useAuth } from "../../context/useAuth";
import "./navigation.css";
import Sidebar from "./Sidebar";
import TopHeader from "./TopHeader";
import PageTransition from "./PageTransition";

export default function AppLayout({ children, title, subtitle, fullWidth = false }) {
  const { role } = useAuth();
  // Persist sidebar collapsed state
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("acadpro_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem("acadpro_sidebar_collapsed", String(collapsed));
    } catch {
      // ignore
    }
  }, [collapsed]);

  return (
    <div data-navigation-role={role} className="min-h-screen bg-[#08090D] text-[#F5F3EF] flex flex-col selection:bg-[#75D7FF]/20 selection:text-[#75D7FF]">
      {/* Unified Sidebar Navigation */}
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${
          collapsed ? "md:pl-20" : "md:pl-64"
        }`}
      >
        {/* Sticky Header */}
        <TopHeader
          setMobileOpen={setMobileOpen}
          title={title}
          subtitle={subtitle}
        />

        {/* Page Content */}
        <main className="flex-1 w-full">
          <PageTransition>
            <div
              className={`w-full mx-auto p-4 sm:p-6 lg:p-8 ${
                fullWidth ? "max-w-7xl" : "max-w-6xl"
              }`}
            >
              {children}
            </div>
          </PageTransition>
        </main>
      </div>
    </div>
  );
}
