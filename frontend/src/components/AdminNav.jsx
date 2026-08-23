import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ClipboardList, TrendingUp, UtensilsCrossed, History, LogOut } from "lucide-react";
import { useStaffAuth } from "@/lib/StaffAuthContext";
import { Button } from "@/components/ui/button";

const TABS = [
  { path: "/orders", label: "Orders", icon: ClipboardList },
  { path: "/analytics", label: "Analytics", icon: TrendingUp },
  { path: "/menu-management", label: "Menu", icon: UtensilsCrossed },
  { path: "/order-history", label: "History", icon: History },
];

export default function AdminNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { staff, logoutStaff } = useStaffAuth();

  const handleLogout = () => {
    logoutStaff();
    navigate("/");
  };

  return (
    <nav className="sticky top-16 z-20 bg-background/80 backdrop-blur-md border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full flex items-center justify-between gap-1 overflow-x-auto">
        <div className="flex items-center gap-1">
          {TABS.map((tab) => {
            const active = location.pathname === tab.path;
            const Icon = tab.icon;
            return (
              <Link
                key={tab.path}
                to={tab.path}
                className={`inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  active
                    ? "border-emerald-600 text-emerald-700"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" /> {tab.label}
              </Link>
            );
          })}
        </div>
        {staff && (
          <div className="flex items-center gap-2 shrink-0 pl-2">
            <span className="text-xs text-muted-foreground hidden sm:inline">{staff.full_name}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-destructive">
              <LogOut className="w-4 h-4 mr-1.5" /> Logout
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
}
