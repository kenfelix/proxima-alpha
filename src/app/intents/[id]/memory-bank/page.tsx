"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import QRCode from "react-qr-code";
import { doc, getDoc, collection, addDoc, query, onSnapshot, orderBy } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Hangout } from "@/lib/types";

export default function MemoryBankPage() {
  const params = useParams();
  const intentId = params.id as string;
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [hangout, setHangout] = useState<Hangout | null>(null);
  const [loading, setLoading] = useState(true);
  const [memories, setMemories] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [tempFile, setTempFile] = useState<{url: string, type: string} | null>(null);

  useEffect(() => {
    async function fetchHangout() {
      if (!intentId) return;
      const docSnap = await getDoc(doc(db, "hangouts", intentId));
      if (docSnap.exists()) {
        setHangout({ id: docSnap.id, ...docSnap.data() } as Hangout);
      }
      setLoading(false);
    }
    fetchHangout();
  }, [intentId]);

  useEffect(() => {
    if (!intentId || !hangout) return;
    
    // Listen to memories subcollection
    const q = query(collection(db, "hangouts", intentId, "memories"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const memoryData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMemories(memoryData);
    });
    return () => unsubscribe();
  }, [intentId, hangout]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0];
    if (!file || !user || !hangout) return;
    
    // reset input value so the same file can be uploaded again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setUploading(true);
    setUploadProgress(0);

    const isVideo = file.type.startsWith('video/');
    setTempFile({ url: URL.createObjectURL(file), type: isVideo ? 'video' : 'image' });

    const storageRef = ref(storage, `memories/${intentId}/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed', 
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      }, 
      (error) => {
        console.error("Error uploading:", error);
        alert("Failed to upload memory.");
        setUploading(false);
        setUploadProgress(null);
        setTempFile(null);
      }, 
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        await addDoc(collection(db, "hangouts", intentId, "memories"), {
          url,
          uploadedBy: user.uid,
          createdAt: new Date().getTime(),
          type: file.type.startsWith('video/') ? 'video' : 'image'
        });
        setUploading(false);
        setUploadProgress(null);
        setTempFile(null);
      }
    );
  };

  if (loading) return <div className="min-h-screen bg-neutral-950 flex items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;
  if (!hangout) return <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-white">Hangout not found.</div>;

  const isHost = user?.uid === hangout.hostId;
  const isPresent = user && (hangout.presentAttendees?.includes(user.uid) || isHost);

  const checkInUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/intents/${intentId}/check-in`;

  return (
    <main className="min-h-screen bg-black text-white p-6 sm:p-12 font-sans">
      <div className="max-w-4xl mx-auto pt-10">
        <div className="mb-8 border-b border-neutral-900 pb-6 flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-bold text-white tracking-tight">
              The Memory Bank
            </h1>
            <p className="text-neutral-400 mt-2 font-medium">{hangout.title}</p>
          </div>
          {isPresent && (
            <div className="bg-neutral-900 px-4 py-2 rounded-full flex items-center gap-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span className="text-xs uppercase tracking-wider text-white font-semibold">Unlocked</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Host Panel (QR Code) */}
          {isHost && (
            <div className="md:col-span-1">
              <div className="border border-neutral-900 p-6 rounded-3xl flex flex-col items-center text-center">
                <h3 className="font-semibold text-lg text-white mb-2">Host Check-in QR</h3>
                <p className="text-sm text-neutral-400 mb-6">Have attendees scan this to unlock their Memory Bank.</p>
                
                <div className="bg-white p-4 rounded-2xl mb-6">
                  <QRCode value={checkInUrl} size={180} />
                </div>
                
                <p className="text-xs text-neutral-500">Only scanned attendees can view or upload photos.</p>
              </div>
            </div>
          )}

          {/* Guest Panel (Locked) */}
          {!isPresent && (
            <div className="md:col-span-3">
               <div className="border border-neutral-900 p-12 rounded-3xl flex flex-col items-center text-center">
                 <div className="w-20 h-20 bg-neutral-900 rounded-full flex items-center justify-center mb-6">
                   <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                 </div>
                 <h2 className="text-2xl font-bold mb-3 text-white">Memory Bank Locked</h2>
                 <p className="text-neutral-400 max-w-md mb-8 leading-relaxed">
                   You must physically attend the hangout to unlock this vault.
                 </p>
                 <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl w-full max-w-sm">
                   <h3 className="text-white font-bold mb-2">How to unlock:</h3>
                   <ol className="text-neutral-400 text-sm text-left space-y-3 list-decimal pl-5">
                     <li>Find the Host in person.</li>
                     <li>Open your phone's regular <strong>Camera App</strong>.</li>
                     <li>Scan the Host's "Check-in QR Code".</li>
                   </ol>
                 </div>
               </div>
            </div>
          )}

          {/* Gallery Panel (Unlocked) */}
          {isPresent && (
            <div className={isHost ? "md:col-span-2" : "md:col-span-3"}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Captured Moments</h3>
                <div>
                  <input 
                    type="file" 
                    accept="image/*,video/*" 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                  />
                  <Button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="bg-white hover:bg-neutral-200 text-black rounded-full flex items-center gap-2 font-bold px-5 relative overflow-hidden"
                  >
                    {uploading && uploadProgress !== null && (
                      <div 
                        className="absolute left-0 top-0 bottom-0 bg-indigo-500/20" 
                        style={{ width: `${uploadProgress}%` }} 
                      />
                    )}
                    <svg className="w-5 h-5 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    <span className="relative z-10">
                      {uploading ? (uploadProgress !== null ? `Uploading ${Math.round(uploadProgress)}%` : "Uploading...") : "Add Photo/Video"}
                    </span>
                  </Button>
                </div>
              </div>

              {memories.length === 0 && !tempFile ? (
                <div className="border border-neutral-900 border-dashed rounded-3xl p-12 text-center">
                  <p className="text-neutral-500">No memories uploaded yet. Be the first!</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {tempFile && uploading && uploadProgress !== null && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="aspect-square bg-neutral-800 rounded-2xl overflow-hidden relative"
                    >
                      {tempFile.type === 'video' ? (
                        <video src={tempFile.url} className="w-full h-full object-cover opacity-40 blur-sm" />
                      ) : (
                        <img src={tempFile.url} alt="Uploading..." className="w-full h-full object-cover opacity-40 blur-sm" />
                      )}
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className="relative w-12 h-12 flex items-center justify-center mb-2">
                           <div className="absolute inset-0 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                        </div>
                        <span className="text-white font-bold text-sm drop-shadow-md">{Math.round(uploadProgress)}%</span>
                      </div>
                    </motion.div>
                  )}
                  {memories.map((mem) => (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      key={mem.id} 
                      className="aspect-square bg-neutral-800 rounded-2xl overflow-hidden relative group"
                    >
                      {mem.type === 'video' ? (
                        <video src={mem.url} controls className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      ) : (
                        <img src={mem.url} alt="Memory" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                        <p className="text-xs text-white font-medium">{new Date(mem.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </main>
  );
}
