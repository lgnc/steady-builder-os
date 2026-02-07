import { Link, useLocation } from "react-router-dom";
import { Calendar, Home, Utensils, User, Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/dashboard", icon: Home, label: "Today" },
  { path: "/training", icon: Dumbbell, label: "Training" },
  { path: "/calendar", icon: Calendar, label: "Calendar" },
  { path: "/nutrition", icon: Utensils, label: "Nutrition" },
  { path: "/profile", icon: User, label: "Profile" },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="flex items-center justify-around px-2 py-3">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors duration-200",
              isActive
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-2xs font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
