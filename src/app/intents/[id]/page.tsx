"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Intent, UserProfile } from "@/lib/types";
import { UserRepository } from "@/lib/repositories/UserRepository";
import { NotificationService } from "@/lib/services/NotificationService";

export default function IntentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const [intent, setIntent] = useState<Intent | null>(null);
  const [creator, setCreator] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  
  const intentId = params.id as string;

  useEffect(() => {
    async function fetchIntent() {
      if (!intentId) return;
      const docRef = doc(db, "intents", intentId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() } as Intent;
        setIntent(data);
        
        // Fetch creator details
        const creatorData = await UserRepository.getUser(data.creatorId);
        setCreator(creatorData);
      }
      setLoading(false);
    }
    fetchIntent();
  }, [intentId]);

  const handleImDown = async () => {
    if (!user || !intent) {
      if (!user) router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setIsJoining(true);
    try {
      const intentRef = doc(db, "intents", intentId);
      await updateDoc(intentRef, {
        interestedUsers: arrayUnion(user.uid)
      });
      
      // Build Connection organically
      await UserRepository.addConnection(intent.creatorId, user.uid);
      await UserRepository.addConnection(user.uid, intent.creatorId);
      
      // Add to local schedule so it appears in The Ledger immediately
      const myEventsStr = localStorage.getItem("proxima_my_events");
      const myEvents = myEventsStr ? JSON.parse(myEventsStr) : [];
      if (!myEvents.includes(intentId)) {
        myEvents.push(intentId);
        localStorage.setItem("proxima_my_events", JSON.stringify(myEvents));
      }
      
      setIntent({
        ...intent,
        interestedUsers: [...intent.interestedUsers, user.uid]
      });

      // Notify the creator
      try {
        if (creator) {
          const joinerProfile = await UserRepository.getUser(user.uid);
          await NotificationService.sendNotification(
            [creator.id],
            "Someone is Down! ✌️",
            `${joinerProfile?.name || 'Someone'} is down for ${intent.activity}.`,
            `${window.location.origin}/intents/${intentId}`,
            'system'
          );
        }
      } catch (e) {
        console.error("Failed to notify creator", e);
      }
    } catch (error) {
      console.error("Error joining intent:", error);
    }
    setIsJoining(false);
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: 'Proxima Intent',
        text: `I'm down to ${intent?.activity}. Are you?`,
        url: url,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(url);
      alert("Link copied to clipboard!");
    }
  };

  const startPlanner = async () => {
    if (!intent || !user) return;
    
    // Notify interested users that planning has started
    try {
      const otherUsers = intent.interestedUsers.filter(uid => uid !== user.uid);
      if (otherUsers.length > 0) {
        await NotificationService.sendNotification(
          otherUsers,
          "Planning Started! 📅",
          `${creator?.name || 'The host'} is putting together a plan for ${intent.activity}. Head to the Hub!`,
          `${window.location.origin}/intents/${intentId}/hub`,
          'system'
        );
      }
    } catch (e) {
      console.error("Failed to send planning push notification", e);
    }
    
    router.push(`/intents/${intentId}/hub`);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </main>
    );
  }

  if (!intent) return <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-white">Intent not found.</div>;

  const isCreator = user?.uid === intent.creatorId;
  const hasJoined = user && intent.interestedUsers.includes(user.uid);

  return (
    <main className="min-h-screen bg-black text-white p-6 sm:p-12 font-sans">
      <div className="max-w-2xl mx-auto pt-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="pb-8 sm:pb-12"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center text-xl font-bold">
              {creator?.name?.charAt(0) || "U"}
            </div>
            <div>
              <p className="text-neutral-400 text-sm">Intent created by</p>
              <h2 className="text-xl font-semibold tracking-tight">{creator?.name}</h2>
            </div>
          </div>

          <div className="space-y-6 mb-12">
            <div>
              <h1 className="text-4xl sm:text-5xl font-bold text-white mb-2 leading-tight">
                {intent.activity}
              </h1>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="py-5 border-b border-neutral-900">
                <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1 font-semibold">Timeframe</p>
                <p className="text-lg font-medium text-white">{intent.timeframe}</p>
              </div>
              <div className="py-5 border-b border-neutral-900">
                <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1 font-semibold">Location Idea</p>
                <p className="text-lg font-medium text-white">{intent.location || "To be decided"}</p>
              </div>
            </div>

            {intent.description && (
              <div className="py-5 border-b border-neutral-900">
                <p className="text-xs text-neutral-500 uppercase tracking-wider mb-2 font-semibold">The Vibe</p>
                <p className="text-neutral-300 leading-relaxed">{intent.description}</p>
              </div>
            )}
          </div>

          <div className="pt-8">
            {isCreator ? (
              <div className="space-y-8">
                <div className="flex items-center justify-between py-5 border-b border-neutral-900">
                  <div>
                    <p className="font-medium text-lg text-white">{intent.interestedUsers.length} people are down</p>
                    <p className="text-sm text-neutral-500 mt-1">Wait for responses before planning.</p>
                  </div>
                  <Button onClick={handleShare} className="bg-neutral-900 hover:bg-neutral-800 text-white rounded-full px-6 py-6 font-semibold">
                    Share Link
                  </Button>
                </div>
                
                {intent.interestedUsers.length > 1 && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <Button 
                      onClick={startPlanner}
                      className="w-full py-7 mt-4 bg-white hover:bg-neutral-200 text-black rounded-full text-lg font-bold transition-all"
                    >
                      Transition to Hangout Planner
                    </Button>
                  </motion.div>
                )}
              </div>
            ) : (
              <div>
                {!hasJoined ? (
                  <Button 
                    onClick={handleImDown}
                    disabled={isJoining}
                    className="w-full py-8 bg-white hover:bg-neutral-200 text-black rounded-full text-xl font-bold transition-all"
                  >
                    {isJoining ? "Connecting..." : "I'm Down ✌️"}
                  </Button>
                ) : (
                  <motion.div 
                    initial={{ scale: 0.95 }} animate={{ scale: 1 }}
                    className="text-center py-6 border border-neutral-800 rounded-3xl"
                  >
                    <p className="text-white font-semibold text-lg flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      You're in!
                    </p>
                    <p className="text-sm text-neutral-400 mt-1">You are now mutually connected with {creator?.name.split(" ")[0] || "the host"}.</p>
                    <p className="text-sm text-neutral-400 mt-3">Waiting for the host to finalize the plan.</p>
                  </motion.div>
                )}
                {!user && !hasJoined && (
                  <p className="text-center text-sm text-neutral-500 mt-4">
                    You'll be asked to sign in to confirm.
                  </p>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </main>
  );
}
