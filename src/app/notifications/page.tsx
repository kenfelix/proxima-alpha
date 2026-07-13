"use client";

import { useEffect, useState } from "react";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationService, AppNotification } from "@/lib/services/NotificationService";
import { useRouter } from "next/navigation";
import { Bell, CheckCircle2, MessageSquare, CreditCard, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotificationsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadNotifications() {
      if (!user) return;
      try {
        const q = query(
          collection(db, "notifications"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);
        const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppNotification));
        setNotifications(notifs);
      } catch (e) {
        console.error("Error loading notifications", e);
      }
      setIsLoading(false);
    }
    loadNotifications();
  }, [user]);

  const handleNotificationClick = async (notification: AppNotification) => {
    if (!notification.read && notification.id) {
      await NotificationService.markAsRead(notification.id);
    }
    router.push(notification.link);
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    await NotificationService.markAllAsRead(user.uid);
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'intent': return <Calendar size={20} className="text-indigo-400" />;
      case 'vote': return <CheckCircle2 size={20} className="text-emerald-400" />;
      case 'chat': return <MessageSquare size={20} className="text-blue-400" />;
      case 'payment': return <CreditCard size={20} className="text-yellow-400" />;
      default: return <Bell size={20} className="text-neutral-400" />;
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-50 p-4 sm:p-12 pb-32">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Alerts</h1>
            <p className="text-neutral-400 mt-2">Stay updated on your hangouts.</p>
          </div>
          {unreadCount > 0 && (
            <Button 
              onClick={handleMarkAllRead}
              variant="outline"
              size="sm"
              className="text-neutral-400 border-neutral-800 hover:bg-neutral-900"
            >
              Mark all as read
            </Button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-20 bg-neutral-900/30 rounded-3xl border border-neutral-800/50">
            <div className="w-16 h-16 bg-neutral-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell size={24} className="text-neutral-500" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No new alerts</h3>
            <p className="text-neutral-500">You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div 
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer flex gap-4 ${
                  notification.read 
                    ? 'bg-[#0a0a0a] border-neutral-900 hover:border-neutral-800' 
                    : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <div className="mt-1 flex-shrink-0">
                  {getIconForType(notification.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <h4 className={`font-semibold ${notification.read ? 'text-neutral-300' : 'text-white'}`}>
                      {notification.title}
                    </h4>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-indigo-500 rounded-full flex-shrink-0 mt-2"></div>
                    )}
                  </div>
                  <p className={`text-sm mt-1 leading-relaxed ${notification.read ? 'text-neutral-500' : 'text-neutral-300'}`}>
                    {notification.body}
                  </p>
                  <p className="text-xs text-neutral-600 mt-3">
                    {notification.createdAt ? new Date(notification.createdAt.seconds * 1000).toLocaleString() : 'Just now'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
