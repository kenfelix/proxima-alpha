"use client";

import { useState, useEffect } from "react";
import { getToken } from "firebase/messaging";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db, messaging } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

export function NotificationPrompt() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    if (typeof window !== "undefined" && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const handleEnable = async () => {
    try {
      const p = await Notification.requestPermission();
      setPermission(p);

      if (p === "granted" && user && messaging) {
        const token = await getToken(messaging, { 
          vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY 
        });
        
        if (token) {
          await updateDoc(doc(db, "users", user.uid), {
            deviceTokens: arrayUnion(token)
          });
          console.log("Push token saved!");
        }
      }
    } catch (error) {
      console.error("Error enabling notifications", error);
    }
  };

  if (permission === "granted" || permission === "denied" || !user) return null;

  return (
    <div className="bg-indigo-600/20 border border-indigo-500/30 p-4 rounded-2xl flex items-center justify-between mb-8">
      <div>
        <p className="font-semibold text-indigo-50">Enable Notifications</p>
        <p className="text-sm text-indigo-200">Get instantly notified when hangouts are confirmed.</p>
      </div>
      <Button onClick={handleEnable} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-4 py-2 text-sm shadow-lg">
        Enable
      </Button>
    </div>
  );
}
