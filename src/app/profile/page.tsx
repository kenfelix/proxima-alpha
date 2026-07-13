"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

export default function ProfilePage() {
  const { user, profile, loading, logout } = useAuth();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    bankName: "",
    accountNumber: "",
    accountName: "",
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    } else if (profile) {
      setFormData({
        name: profile.name || "",
        phone: profile.phone || "",
        bankName: profile.hostPaymentDetails?.bankName || "",
        accountNumber: profile.hostPaymentDetails?.accountNumber || "",
        accountName: profile.hostPaymentDetails?.accountName || "",
      });
    }
  }, [user, loading, profile, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);

    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        name: formData.name,
        phone: formData.phone,
        hostPaymentDetails: {
          bankName: formData.bankName,
          accountNumber: formData.accountNumber,
          accountName: formData.accountName,
        }
      });
      alert("Profile updated successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to update profile.");
    }
    setIsSaving(false);
  };

  if (loading || !profile) return <div className="min-h-screen bg-neutral-950 flex items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <main className="min-h-screen bg-black text-white p-6 sm:p-12 font-sans">
      <div className="max-w-2xl mx-auto pt-10">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-4xl font-bold tracking-tight">Your Identity</h1>
          <Button 
            onClick={logout} 
            variant="outline" 
            className="border-neutral-800 bg-transparent text-neutral-400 hover:text-white hover:bg-neutral-900 rounded-full"
          >
            Log out
          </Button>
        </div>
        <p className="text-neutral-400 mb-10">Manage your Proxima profile and banking details.</p>
        
        <form onSubmit={handleSave} className="space-y-12">
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h3 className="text-lg font-semibold mb-6 border-b border-neutral-800 pb-3">Personal Details</h3>
            <div className="space-y-5">
              <div>
                <label className="text-xs text-neutral-500 uppercase tracking-wider mb-2 block font-semibold">Full Name</label>
                <input 
                  name="name" value={formData.name} onChange={handleChange} required
                  className="w-full bg-transparent border-b border-neutral-800 rounded-none px-0 py-3 focus:outline-none focus:border-white transition-all text-white placeholder-neutral-700"
                />
              </div>
              <div>
                <label className="text-xs text-neutral-500 uppercase tracking-wider mb-2 block font-semibold">Phone Number</label>
                <input 
                  name="phone" value={formData.phone} onChange={handleChange}
                  className="w-full bg-transparent border-b border-neutral-800 rounded-none px-0 py-3 focus:outline-none focus:border-white transition-all text-white placeholder-neutral-700"
                />
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <div className="flex items-center gap-3 mb-6 border-b border-neutral-800 pb-3">
              <div className="p-2 bg-neutral-900 rounded-lg text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
              </div>
              <h3 className="text-lg font-semibold text-white">Host Payment Details</h3>
            </div>
            <p className="text-sm text-neutral-400 mb-6 leading-relaxed">If you plan on hosting Hangouts, attendees will use these details to transfer funds to your Manual Ledger. We do not process these payments directly.</p>
            
            <div className="space-y-5">
              <div>
                <label className="text-xs text-neutral-500 uppercase tracking-wider mb-2 block font-semibold">Bank Name</label>
                <input 
                  name="bankName" value={formData.bankName} onChange={handleChange} placeholder="e.g., GTBank, Monzo"
                  className="w-full bg-transparent border-b border-neutral-800 rounded-none px-0 py-3 focus:outline-none focus:border-white transition-all text-white placeholder-neutral-700"
                />
              </div>
              <div>
                <label className="text-xs text-neutral-500 uppercase tracking-wider mb-2 block font-semibold">Account Number</label>
                <input 
                  name="accountNumber" value={formData.accountNumber} onChange={handleChange}
                  className="w-full bg-transparent border-b border-neutral-800 rounded-none px-0 py-3 focus:outline-none focus:border-white transition-all text-white placeholder-neutral-700"
                />
              </div>
              <div>
                <label className="text-xs text-neutral-500 uppercase tracking-wider mb-2 block font-semibold">Account Name</label>
                <input 
                  name="accountName" value={formData.accountName} onChange={handleChange}
                  className="w-full bg-transparent border-b border-neutral-800 rounded-none px-0 py-3 focus:outline-none focus:border-white transition-all text-white placeholder-neutral-700"
                />
              </div>
            </div>
          </motion.div>

          <Button type="submit" disabled={isSaving} className="w-full py-7 bg-white hover:bg-neutral-200 text-black font-bold rounded-full text-lg transition-all">
            {isSaving ? "Saving..." : "Save Identity"}
          </Button>
        </form>
      </div>
    </main>
  );
}
