"use client";

import { useEffect, useState, use } from "react";
import { doc, getDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";
import { MapPin, Calendar, Clock } from "lucide-react";

const avatars = [
  "🤠", "😎", "🦊", "🐯", "🐼", "🦄", "👽", "🤖", "👻", "🥑"
];

export default function IntentPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const eventId = unwrappedParams.id;
  
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [isRsvping, setIsRsvping] = useState(false);
  const [rsvpData, setRsvpData] = useState({ name: "", avatar: "😎" });
  const [showRsvpForm, setShowRsvpForm] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const docRef = doc(db, "events", eventId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setEvent(docSnap.data());
        } else {
          console.log("No such document!");
        }
      } catch (error) {
        console.error("Error fetching event:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [eventId]);

  const handleRsvpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRsvping(true);

    try {
      // Get or generate User ID
      let profileStr = localStorage.getItem("proxima_user_profile");
      let profile = profileStr ? JSON.parse(profileStr) : null;
      
      if (!profile) {
        import("uuid").then(({ v4: uuidv4 }) => {
          profile = {
            id: uuidv4(),
            name: rsvpData.name,
            avatar: rsvpData.avatar,
          };
          localStorage.setItem("proxima_user_profile", JSON.stringify(profile));
          proceedWithRsvp(profile);
        });
      } else {
        // Update name/avatar if they changed it
        profile.name = rsvpData.name;
        profile.avatar = rsvpData.avatar;
        localStorage.setItem("proxima_user_profile", JSON.stringify(profile));
        proceedWithRsvp(profile);
      }
    } catch (error) {
      console.error("Error setting up profile:", error);
      setIsRsvping(false);
    }
  };

  const proceedWithRsvp = async (profile: any) => {
    try {
      await addDoc(collection(db, "events", eventId, "rsvps"), {
        userId: profile.id,
        name: profile.name,
        avatar: profile.avatar,
        timestamp: serverTimestamp(),
      });
      
      // Save event to local storage for "My Schedule"
      const myEventsStr = localStorage.getItem("proxima_my_events");
      let myEvents = myEventsStr ? JSON.parse(myEventsStr) : [];
      if (!myEvents.includes(eventId)) {
        myEvents.push(eventId);
        localStorage.setItem("proxima_my_events", JSON.stringify(myEvents));
      }

      // Trigger confetti
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#818cf8', '#c084fc', '#e879f9']
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#818cf8', '#c084fc', '#e879f9']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();

      setTimeout(() => {
        router.push(`/events/${eventId}/hub`);
      }, 2000);
      
    } catch (error) {
      console.error("Error saving RSVP:", error);
      alert("Failed to RSVP. Please try again.");
      setIsRsvping(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Intent Not Found</h1>
          <p className="text-neutral-400">This event may have expired or never existed.</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-50 flex flex-col items-center justify-center p-6 sm:p-12 font-sans overflow-hidden">
      <AnimatePresence mode="wait">
        {!showRsvpForm ? (
          <motion.div 
            key="intent-card"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6, type: "spring", bounce: 0.4 }}
            className="max-w-md w-full bg-neutral-900/50 backdrop-blur-xl border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-8">
              <div className="inline-block px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-xs font-semibold tracking-wide uppercase mb-6">
                Upcoming Intent
              </div>
              <h1 className="text-4xl font-extrabold mb-6 leading-tight bg-gradient-to-br from-white to-neutral-400 bg-clip-text text-transparent">
                {event.title}
              </h1>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-center text-neutral-300">
                  <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center mr-4">
                    <Calendar className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{event.date}</p>
                    <p className="text-xs text-neutral-500">Date</p>
                  </div>
                </div>
                <div className="flex items-center text-neutral-300">
                  <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center mr-4">
                    <Clock className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{event.time}</p>
                    <p className="text-xs text-neutral-500">Time</p>
                  </div>
                </div>
                <div className="flex items-center text-neutral-300">
                  <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center mr-4">
                    <MapPin className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{event.location}</p>
                    <p className="text-xs text-neutral-500">Location</p>
                  </div>
                </div>
              </div>

              {event.description && (
                <div className="p-4 bg-neutral-950/50 rounded-2xl mb-8 border border-neutral-800/50">
                  <p className="text-neutral-400 text-sm leading-relaxed">
                    "{event.description}"
                  </p>
                </div>
              )}

              <Button 
                onClick={() => setShowRsvpForm(true)}
                className="w-full py-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-lg shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] group"
              >
                Count Me In
                <motion.span 
                  className="ml-2 inline-block"
                  animate={{ x: [0, 5, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  →
                </motion.span>
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="rsvp-form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md w-full bg-neutral-900/50 backdrop-blur-xl border border-neutral-800 p-8 rounded-3xl shadow-2xl"
          >
            <h2 className="text-3xl font-bold mb-2">You're in.</h2>
            <p className="text-neutral-400 mb-8">Who are we expecting?</p>

            <form onSubmit={handleRsvpSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider ml-1">Your Name</label>
                <input 
                  required
                  autoFocus
                  name="name"
                  value={rsvpData.name}
                  onChange={(e) => setRsvpData({ ...rsvpData, name: e.target.value })}
                  placeholder="e.g., Alex" 
                  className="w-full bg-neutral-950/50 border border-neutral-800 rounded-xl px-4 py-3 text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-lg"
                />
              </div>

              <div className="space-y-3">
                <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider ml-1">Pick your Vibe (Avatar)</label>
                <div className="grid grid-cols-5 gap-3">
                  {avatars.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setRsvpData({ ...rsvpData, avatar: emoji })}
                      className={`text-3xl w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                        rsvpData.avatar === emoji 
                          ? 'bg-indigo-500/30 border-2 border-indigo-500 scale-110 shadow-[0_0_15px_rgba(79,70,229,0.4)]' 
                          : 'bg-neutral-800 border-2 border-transparent hover:bg-neutral-700 hover:scale-105'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => setShowRsvpForm(false)}
                  className="flex-1 py-6 rounded-xl border-neutral-700 hover:bg-neutral-800 text-neutral-300"
                >
                  Back
                </Button>
                <Button 
                  type="submit" 
                  disabled={isRsvping || !rsvpData.name.trim()}
                  className="flex-[2] py-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all"
                >
                  {isRsvping ? "Confirming..." : "Confirm RSVP"}
                </Button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
