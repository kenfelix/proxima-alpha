"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion } from "framer-motion";
import { Calendar, MapPin, Clock } from "lucide-react";
import Link from "next/link";

export default function SchedulePage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const fetchMyEvents = async () => {
      // Get profile
      const profileStr = localStorage.getItem("proxima_user_profile");
      if (profileStr) {
        setProfile(JSON.parse(profileStr));
      }

      // Get saved events
      const myEventsStr = localStorage.getItem("proxima_my_events");
      if (myEventsStr) {
        const eventIds = JSON.parse(myEventsStr);
        const fetchedEvents = [];
        
        for (const id of eventIds) {
          try {
            const docRef = doc(db, "events", id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              fetchedEvents.push({ id, ...docSnap.data() });
            }
          } catch (e) {
            console.error("Failed to fetch event", id);
          }
        }
        setEvents(fetchedEvents);
      }
      setLoading(false);
    };

    fetchMyEvents();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-50 p-6 sm:p-12 font-sans overflow-x-hidden">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-neutral-900/50 backdrop-blur-xl border border-neutral-800 rounded-3xl p-8 flex items-center justify-between"
        >
          <div>
            <div className="inline-block px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-xs font-semibold tracking-wide uppercase mb-4">
              The Ledger
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-br from-white to-neutral-400 bg-clip-text text-transparent">
              My Schedule
            </h1>
          </div>
          {profile && (
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-neutral-800 border-2 border-indigo-500 flex items-center justify-center text-3xl shadow-[0_0_15px_rgba(79,70,229,0.4)]">
                {profile.avatar}
              </div>
              <p className="mt-2 text-sm font-medium">{profile.name}</p>
            </div>
          )}
        </motion.div>

        {/* Events List */}
        <div className="space-y-4">
          {events.length === 0 ? (
            <div className="p-12 text-center bg-neutral-900/50 border border-neutral-800 border-dashed rounded-3xl">
              <p className="text-neutral-400 mb-4">You haven't joined any hangouts yet.</p>
              <Link href="/" className="text-indigo-400 hover:text-indigo-300 font-medium">
                Create an Intent →
              </Link>
            </div>
          ) : (
            events.map((event, idx) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                key={event.id}
              >
                <Link href={`/events/${event.id}/hub`}>
                  <div className="group bg-neutral-900/50 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 rounded-2xl p-6 transition-all cursor-pointer flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h2 className="text-xl font-bold mb-2 group-hover:text-indigo-300 transition-colors">{event.title}</h2>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-400">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1 text-indigo-400" />
                          {event.date}
                        </div>
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-1 text-indigo-400" />
                          {event.time}
                        </div>
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-1 text-indigo-400" />
                          {event.location}
                        </div>
                      </div>
                    </div>
                    <div className="bg-indigo-600/10 text-indigo-400 px-4 py-2 rounded-xl text-sm font-medium group-hover:bg-indigo-600 group-hover:text-white transition-all">
                      Go to Hub →
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
