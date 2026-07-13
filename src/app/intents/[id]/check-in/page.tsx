"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { HangoutRepository } from "@/lib/repositories/HangoutRepository";

export default function CheckInPage() {
  const params = useParams();
  const intentId = params.id as string;
  const { user, loading } = useAuth();
  const router = useRouter();
  
  const [status, setStatus] = useState("Checking you in...");

  useEffect(() => {
    async function processCheckIn() {
      if (loading) return;
      if (!user) {
        setStatus("Redirecting to login...");
        router.push("/login");
        return;
      }
      
      try {
        // Mark as present using the repository
        await HangoutRepository.markPresent(intentId, user.uid);
        setStatus("Success! Unlocking the Memory Bank...");
        
        // Redirect to memory bank after a short delay
        setTimeout(() => {
          router.push(`/intents/${intentId}/memory-bank`);
        }, 1500);
      } catch (e) {
        console.error(e);
        setStatus("Failed to check in. Please try again.");
      }
    }
    processCheckIn();
  }, [intentId, user, loading, router]);

  return (
    <main className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-white">
      <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-lg font-medium animate-pulse text-green-400">{status}</p>
    </main>
  );
}
