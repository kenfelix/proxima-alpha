"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationPrompt } from "@/components/NotificationPrompt";
import { CreateIntentModal } from "@/components/CreateIntentModal";
import { Plus, Compass, Clock, MapPin, Users } from "lucide-react";
import Link from "next/link";

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [intents, setIntents] = useState<any[]>([]);
  const [isLoadingIntents, setIsLoadingIntents] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchIntents = async () => {
      if (!user) return;
      try {
        const q = query(
          collection(db, "intents"),
          where("interestedUsers", "array-contains", user.uid)
        );
        const snapshot = await getDocs(q);
        const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        fetched.sort((a: any, b: any) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
        setIntents(fetched);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoadingIntents(false);
      }
    };
    fetchIntents();
  }, [user, isModalOpen]);

  if (loading || !user) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-neutral-50 relative overflow-x-hidden font-sans pb-24">
      <div className="max-w-2xl mx-auto w-full relative z-10 px-4 sm:px-6 pt-12">
        <header className="mb-8 flex items-center justify-between border-b border-neutral-900 pb-4">
          <h1 className="text-2xl font-bold text-white">Home</h1>
        </header>

        <NotificationPrompt />

        <div className="mb-8">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="w-full relative bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-6 flex items-center justify-between transition-colors hover:bg-[#111]"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-300">
                <Compass size={24} />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-bold text-white">What's the move?</h3>
                <p className="text-sm text-neutral-500">Post a plan to your circle.</p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center">
              <Plus size={20} strokeWidth={3} />
            </div>
          </button>
        </div>

        {isLoadingIntents ? (
          <div className="space-y-4">
            {[1,2,3].map(i => (
              <div key={i} className="h-32 bg-[#0a0a0a] border border-neutral-800 rounded-2xl animate-pulse"></div>
            ))}
          </div>
        ) : intents.length === 0 ? (
          <div className="text-center py-20 bg-[#0a0a0a] border border-neutral-800 rounded-2xl">
            <Users size={32} className="mx-auto text-neutral-600 mb-4" />
            <h3 className="text-lg font-bold text-neutral-300 mb-2">No active plans</h3>
            <p className="text-neutral-500 text-sm max-w-xs mx-auto">Create a plan above to see who's down.</p>
          </div>
        ) : (
          <div className="grid gap-0 border border-neutral-800 rounded-2xl overflow-hidden bg-[#0a0a0a]">
            {intents.map((intent, i) => (
              <Link 
                href={`/intents/${intent.id}/hub`} 
                key={intent.id}
                className="block p-5 border-b border-neutral-800 last:border-b-0 hover:bg-[#111] transition-colors"
              >
                <h3 className="text-lg font-bold text-white mb-3 line-clamp-1">{intent.activity}</h3>
                
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-neutral-500">
                  <span className="flex items-center gap-1.5"><Clock size={16} /> {intent.timeframe}</span>
                  <span className="flex items-center gap-1.5 truncate"><MapPin size={16} /> {intent.location}</span>
                </div>
                
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {intent.interestedUsers.slice(0, 5).map((u: string) => (
                      <div key={u} className="w-7 h-7 rounded-full bg-neutral-800 border-2 border-[#0a0a0a] flex items-center justify-center text-[9px] font-bold text-neutral-400">
                        {u.substring(0, 2).toUpperCase()}
                      </div>
                    ))}
                    {intent.interestedUsers.length > 5 && (
                      <div className="w-7 h-7 rounded-full bg-neutral-800 border-2 border-[#0a0a0a] flex items-center justify-center text-[9px] font-bold text-neutral-500">
                        +{intent.interestedUsers.length - 5}
                      </div>
                    )}
                  </div>
                  <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                    {intent.status === 'active' ? 'Drafting' : 'Planning'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <CreateIntentModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        userId={user.uid} 
      />
    </main>
  );
}
