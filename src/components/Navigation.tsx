"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, User, Calendar, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export function Navigation() {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  if (loading || !user || pathname === "/login") return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm px-4">
      <div className="bg-[#0a0a0a] border border-neutral-800 rounded-full px-6 py-3 flex items-center justify-between shadow-2xl">
        <NavLink href="/" active={pathname === "/"} icon={<Home size={22} />} label="Home" />
        <NavLink href="/schedule" active={pathname === "/schedule"} icon={<Calendar size={22} />} label="Schedule" />
        <NavLink href="/circle" active={pathname === "/circle"} icon={<Users size={22} />} label="Circle" />
        <NavLink href="/profile" active={pathname === "/profile"} icon={<User size={22} />} label="Profile" />
      </div>
    </div>
  );
}

function NavLink({ href, active, icon, label }: { href: string; active: boolean; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className={`flex flex-col items-center gap-1 transition-colors ${active ? "text-white" : "text-neutral-500 hover:text-neutral-300"}`}>
      {icon}
      <span className="text-[10px] font-medium tracking-wide">{label}</span>
    </Link>
  );
}
