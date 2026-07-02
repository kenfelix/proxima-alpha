"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";

export default function Home() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    date: "",
    time: "",
    location: "",
    description: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Add a new document with a generated id.
      const docRef = await addDoc(collection(db, "events"), {
        ...formData,
        createdAt: serverTimestamp(),
      });
      console.log("Document written with ID: ", docRef.id);
      
      // Redirect to the newly created event's landing page
      router.push(`/events/${docRef.id}`);
    } catch (e) {
      console.error("Error adding document: ", e);
      alert("Failed to create event. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-50 flex flex-col items-center justify-center p-6 sm:p-12 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="max-w-md w-full bg-neutral-900/50 backdrop-blur-xl border border-neutral-800 p-8 rounded-3xl shadow-2xl"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-br from-indigo-400 to-purple-400 bg-clip-text text-transparent mb-2">
            Proxima Alpha
          </h1>
          <p className="text-neutral-400 text-sm">
            Create an Intent. Facilitate Real-World Connection.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider ml-1">What are we doing?</label>
            <input 
              required
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g., Saturday Night Board Games" 
              className="w-full bg-neutral-950/50 border border-neutral-800 rounded-xl px-4 py-3 text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider ml-1">Date</label>
              <input 
                required
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className="w-full bg-neutral-950/50 border border-neutral-800 rounded-xl px-4 py-3 text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all [color-scheme:dark]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider ml-1">Time</label>
              <input 
                required
                type="time"
                name="time"
                value={formData.time}
                onChange={handleChange}
                className="w-full bg-neutral-950/50 border border-neutral-800 rounded-xl px-4 py-3 text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all [color-scheme:dark]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider ml-1">Where are we going?</label>
            <input 
              required
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="e.g., Central Park, NYC" 
              className="w-full bg-neutral-950/50 border border-neutral-800 rounded-xl px-4 py-3 text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider ml-1">The Vibe (Optional)</label>
            <textarea 
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Brief description of what to expect..." 
              className="w-full bg-neutral-950/50 border border-neutral-800 rounded-xl px-4 py-3 text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all min-h-[100px] resize-y"
            />
          </div>

          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full py-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-lg shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all hover:shadow-[0_0_30px_rgba(79,70,229,0.5)]"
          >
            {isSubmitting ? "Generating Link..." : "Create Intent"}
          </Button>
        </form>
      </motion.div>
    </main>
  );
}
