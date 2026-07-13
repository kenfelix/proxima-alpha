"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export function CreateIntentModal({ isOpen, onClose, userId }: { isOpen: boolean; onClose: () => void; userId: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activity, setActivity] = useState("");
  const [timeframe, setTimeframe] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [activity]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activity.trim()) return;
    setIsSubmitting(true);

    try {
      const intentData = {
        creatorId: userId,
        activity: activity.trim(),
        timeframe: timeframe.trim() || "TBD",
        location: "TBD", // Exact details handled in hub voting
        description: "",
        status: 'active',
        createdAt: serverTimestamp(),
        interestedUsers: [userId],
      };
      
      const docRef = await addDoc(collection(db, "intents"), intentData);
      router.push(`/intents/${docRef.id}`);
    } catch (e) {
      console.error("Error adding document: ", e);
      alert("Failed to create intent. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative w-full max-w-lg bg-[#0a0a0a] sm:border sm:border-neutral-800 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
              <button onClick={onClose} className="p-2 text-neutral-400 hover:text-white rounded-full transition-colors">
                <X size={20} />
              </button>
              <button 
                onClick={handleSubmit}
                disabled={isSubmitting || !activity.trim()}
                className="bg-white text-black font-bold text-sm px-5 py-1.5 rounded-full hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? "Posting..." : "Post"}
              </button>
            </div>

            {/* Body */}
            <div className="p-4 pb-8 overflow-y-auto">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-neutral-800 flex-shrink-0 border border-neutral-700"></div>
                
                <div className="flex-1 pt-1">
                  <textarea 
                    ref={textareaRef}
                    value={activity}
                    onChange={(e) => setActivity(e.target.value)}
                    placeholder="What's the move?"
                    className="w-full bg-transparent text-white text-xl placeholder:text-neutral-500 focus:outline-none resize-none min-h-[60px]"
                    autoFocus
                  />
                  
                  <div className="mt-4 border-t border-neutral-800 pt-4">
                    <input 
                      type="text"
                      value={timeframe}
                      onChange={(e) => setTimeframe(e.target.value)}
                      placeholder="When roughly? (Optional)"
                      className="w-full bg-transparent text-neutral-300 text-sm placeholder:text-neutral-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
