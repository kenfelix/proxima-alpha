"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, User, Calendar, Users, Bell } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function Navigation() {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      where("read", "==", false)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.docs.length);
    });
    return () => unsubscribe();
  }, [user]);

  if (loading || !user || pathname === "/login") return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-[420px] px-4">
      <div className="bg-[#0a0a0a] border border-neutral-800 rounded-full px-6 py-3 flex items-center justify-between shadow-2xl">
        <NavLink href="/" active={pathname === "/"} icon={<Home size={22} />} label="Home" />
        <NavLink href="/schedule" active={pathname === "/schedule"} icon={<Calendar size={22} />} label="Schedule" />
        <NavLink href="/circle" active={pathname === "/circle"} icon={<Users size={22} />} label="Circle" />
        <NavLink 
          href="/notifications" 
          active={pathname === "/notifications"} 
          icon={
            <div className="relative">
              <Bell size={22} />
              {unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-[#0a0a0a]" />
              )}
            </div>
          } 
          label="Alerts" 
        />
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
