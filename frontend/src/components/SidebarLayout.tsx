import * as React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Home, Users, Share2 } from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  activeFor?: string[];
}

const navItems: NavItem[] = [
  { label: "Início", href: "/", icon: <Home className="size-5" /> },
  { label: "Deputados", href: "/deputies", icon: <Users className="size-5" /> },
  {
    label: "Explorar Grafo",
    href: "/deputies",
    icon: <Share2 className="size-5" />,
    activeFor: ["/deputies", "/graph"],
  },
];

interface SidebarLayoutProps {
  children: React.ReactNode;
}

export function SidebarLayout({ children }: SidebarLayoutProps) {
  const { pathname } = useLocation();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col bg-zinc-900">
        {/* Logo */}
        <div className="flex h-16 items-center border-b border-zinc-800 px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500">
              <Share2 className="size-4 text-white" />
            </div>
            <span className="text-lg font-semibold text-white">Cotagraph</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : item.activeFor
                  ? item.activeFor.some((p) => pathname.startsWith(p))
                  : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-400 hover:bg-zinc-800/50 hover:text-white"
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-zinc-800 px-6 py-4">
          <p className="text-xs text-zinc-500">Transparência Parlamentar</p>
        </div>
      </aside>

      {/* Main content — offset by sidebar width */}
      <main className="ml-64 flex-1 bg-zinc-50">{children}</main>
    </div>
  );
}
