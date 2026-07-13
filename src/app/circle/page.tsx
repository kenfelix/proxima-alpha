"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Users } from "lucide-react";

export default function CirclePage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  
  const [connections, setConnections] = useState<any[]>([]);
  const [isLoadingConnections, setIsLoadingConnections] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchConnections = async () => {
      if (!profile?.connections || profile.connections.length === 0) {
        setConnections([]);
        setIsLoadingConnections(false);
        return;
      }

      try {
        const fetchedUsers = [];
        for (const uid of profile.connections) {
          const docRef = doc(db, "users", uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            fetchedUsers.push({ id: docSnap.id, ...docSnap.data() });
          }
        }
        setConnections(fetchedUsers);
      } catch (err) {
        console.error("Error fetching connections:", err);
      } finally {
        setIsLoadingConnections(false);
      }
    };

    if (profile) {
      fetchConnections();
    }
  }, [profile]);

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-6 sm:p-12 font-sans overflow-x-hidden">
      <div className="max-w-3xl mx-auto space-y-8 pt-10">
        
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-b border-neutral-900 pb-8 flex items-center justify-between"
        >
          <div>
            <div className="inline-block px-3 py-1 bg-neutral-900 text-white rounded-full text-xs font-semibold tracking-wide uppercase mb-4">
              Social Graph
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Your Circle
            </h1>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-neutral-900 flex items-center justify-center text-white">
              <Users size={28} />
            </div>
          </div>
        </motion.div>

        {/* Connections List */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        >
          {isLoadingConnections ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : connections.length === 0 ? (
            <div className="p-12 text-center border border-neutral-900 border-dashed rounded-3xl">
              <p className="text-neutral-400 mb-2">You haven't connected with anyone yet.</p>
              <p className="text-sm text-neutral-500">Join some hangouts to start building your circle!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {connections.map((conn, idx) => (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 + (idx * 0.05) }}
                  key={conn.id} 
                  className="flex items-center justify-between gap-3 p-4 rounded-3xl border border-neutral-900 hover:border-neutral-700 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-neutral-900 flex items-center justify-center font-bold text-white text-lg">
                      {(conn.name || "U").substring(0, 2).toUpperCase()}
                    </div>
                    <div className="overflow-hidden">
                      <p className="font-bold text-white truncate">{conn.name || "Unknown User"}</p>
                      <p className="text-sm text-neutral-500 truncate">{conn.email || ""}</p>
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-neutral-900 text-neutral-400 text-xs rounded-full font-medium">
                    Friend
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </main>
  );
}
