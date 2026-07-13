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
            let docRef = doc(db, "events", id);
            let docSnap = await getDoc(docRef);
            
            if (!docSnap.exists()) {
              // Try hangouts collection
              docRef = doc(db, "hangouts", id);
              docSnap = await getDoc(docRef);
            }
            
            if (!docSnap.exists()) {
              // Try intents collection if hangout not yet created
              docRef = doc(db, "intents", id);
              docSnap = await getDoc(docRef);
            }
            
            if (docSnap.exists()) {
              const data = docSnap.data();
              fetchedEvents.push({ 
                id, 
                title: data.title || data.activity || "Hangout",
                date: data.confirmedTime ? new Date(data.confirmedTime).toLocaleDateString() : data.timeframe || "TBD",
                time: data.confirmedTime ? new Date(data.confirmedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "",
                location: data.confirmedVenue || data.location || "TBD",
                ...data 
              });
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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-6 sm:p-12 font-sans overflow-x-hidden">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-b border-neutral-900 pb-8 flex items-center justify-between"
        >
          <div>
            <div className="inline-block px-3 py-1 bg-neutral-900 text-white rounded-full text-xs font-semibold tracking-wide uppercase mb-4">
              The Ledger
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white">
              My Schedule
            </h1>
          </div>
          {profile && (
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-neutral-900 flex items-center justify-center text-3xl">
                {profile.avatar}
              </div>
              <p className="mt-2 text-sm font-medium">{profile.name}</p>
            </div>
          )}
        </motion.div>

        {/* Events List */}
        <div className="space-y-4">
          {events.length === 0 ? (
            <div className="p-12 text-center border border-neutral-900 border-dashed rounded-3xl">
              <p className="text-neutral-400 mb-4">You haven't joined any hangouts yet.</p>
              <Link href="/" className="text-white hover:text-neutral-300 font-bold underline underline-offset-4">
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
                <Link href={`/intents/${event.id}/hub`}>
                  <div className="group border border-neutral-900 hover:border-neutral-700 rounded-3xl p-6 transition-all cursor-pointer flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h2 className="text-xl font-bold mb-2 text-white">{event.title}</h2>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-400">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1 text-white" />
                          {event.date}
                        </div>
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-1 text-white" />
                          {event.time}
                        </div>
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-1 text-white" />
                          {event.location}
                        </div>
                      </div>
                    </div>
                    <div className="bg-neutral-900 text-white px-4 py-2 rounded-full text-sm font-medium group-hover:bg-white group-hover:text-black transition-all border border-neutral-800">
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
