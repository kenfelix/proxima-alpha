"use client";

import { useEffect, useState, use, useRef } from "react";
import { doc, getDoc, collection, onSnapshot, addDoc, updateDoc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, Clock, CheckCircle2, Circle, Users, ListTodo, Send, Share, Camera } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { UserRepository } from "@/lib/repositories/UserRepository";
import { NotificationService } from "@/lib/services/NotificationService";
import { useAuth } from "@/contexts/AuthContext";

export default function EventHubPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const eventId = unwrappedParams.id;

  const [event, setEvent] = useState<any>(null);
  const [rsvps, setRsvps] = useState<any[]>([]);
  const [checklist, setChecklist] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const { profile } = useAuth();
  
  const [newItemText, setNewItemText] = useState("");
  const [newMessageText, setNewMessageText] = useState("");
  const [activeTab, setActiveTab] = useState<"details" | "checklist" | "chat">("chat");
  const isFirstLoad = useRef(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch Event Details
    const fetchEvent = async () => {
      const docRef = doc(db, "events", eventId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setEvent(data);
        
        // Fetch profiles for all attendees
        if (data.attendees && Array.isArray(data.attendees)) {
           const profiles = [];
           for (const uid of data.attendees) {
             const userProfile = await UserRepository.getUser(uid);
             if (userProfile) {
               profiles.push({
                 id: userProfile.id,
                 name: userProfile.name,
                 avatar: userProfile.photoUrl || userProfile.name.charAt(0).toUpperCase()
               });
             }
           }
           setRsvps(profiles);
        }
      }
    };
    fetchEvent();

    // Listen to Checklist
    const checklistQuery = query(collection(db, "events", eventId, "checklist"), orderBy("createdAt", "asc"));
    const unsubscribeChecklist = onSnapshot(checklistQuery, (snapshot) => {
      setChecklist(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Listen to Messages
    const messageQuery = query(collection(db, "events", eventId, "messages"), orderBy("timestamp", "asc"));
    const unsubscribeMessages = onSnapshot(messageQuery, (snapshot) => {
      setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubscribeChecklist();
      unsubscribeMessages();
    };
  }, [eventId]);

  // Auto scroll chat
  useEffect(() => {
    if (activeTab === "chat") {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeTab]);

  const handleAddChecklistItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemText.trim() || !profile) return;
    try {
      await addDoc(collection(db, "events", eventId, "checklist"), {
        text: newItemText,
        completed: false,
        addedBy: profile.id,
        createdAt: serverTimestamp()
      });
      setNewItemText("");
    } catch (error) {
      console.error("Error adding item", error);
    }
  };

  const toggleChecklistItem = async (itemId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, "events", eventId, "checklist", itemId), {
        completed: !currentStatus
      });
    } catch (error) {
      console.error("Error updating item", error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() || !profile) return;
    try {
      await addDoc(collection(db, "events", eventId, "messages"), {
        text: newMessageText,
        userId: profile.id,
        name: profile.name,
        avatar: profile.photoUrl || profile.name.charAt(0).toUpperCase(),
        timestamp: serverTimestamp()
      });
      setNewMessageText("");
    } catch (error) {
      console.error("Error sending message", error);
    }
  };

  const handleShare = () => {
    const url = `${window.location.origin}/events/${eventId}`;
    navigator.clipboard.writeText(url);
    toast.success("Invite link copied to clipboard!");
  };

  if (!event) return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-50 p-4 sm:p-12 font-sans overflow-x-hidden flex flex-col">
      <div className="max-w-5xl mx-auto w-full space-y-6 flex-1 flex flex-col">
        
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-b border-neutral-900 pb-6 flex-shrink-0"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-block px-3 py-1 bg-neutral-900 text-white rounded-full text-xs font-semibold tracking-wide uppercase mb-4">
                The Hub
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-white">
                {event.title}
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-4 mt-4 md:mt-0">
              <div className="flex items-center gap-2 bg-neutral-950/50 p-1.5 pr-4 rounded-full border border-neutral-800/50">
                <div className="flex items-center -space-x-2">
                  {rsvps.slice(0, 5).map((rsvp, idx) => (
                    <div 
                      key={rsvp.id} 
                      className="w-8 h-8 rounded-full bg-neutral-800 border border-neutral-900 flex items-center justify-center text-sm shadow-sm relative group"
                      style={{ zIndex: 10 - idx }}
                      title={rsvp.name}
                    >
                      {rsvp.avatar && rsvp.avatar.startsWith('http') ? (
                        <img src={rsvp.avatar} alt={rsvp.name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        rsvp.avatar
                      )}
                    </div>
                  ))}
                  {rsvps.length > 5 && (
                    <div className="w-8 h-8 rounded-full bg-neutral-800 border border-neutral-900 flex items-center justify-center text-[10px] font-bold z-0">
                      +{rsvps.length - 5}
                    </div>
                  )}
                </div>
                <div className="text-xs text-neutral-400 font-medium">{rsvps.length} going</div>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <Link href={`/intents/${eventId}/memory-bank`}>
                  <Button variant="outline" className="rounded-full border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-white h-9 px-4 text-xs font-semibold">
                    <Camera className="w-3.5 h-3.5 mr-2" />
                    Memory Bank
                  </Button>
                </Link>
                <Button onClick={handleShare} variant="outline" className="rounded-full border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-white h-9 px-4 text-xs font-semibold w-full sm:w-auto">
                  <Share className="w-3.5 h-3.5 mr-2" />
                  Invite
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 flex-1 overflow-hidden">
          
          {/* Navigation/Sidebar */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="md:col-span-1 space-y-2 flex flex-row md:flex-col overflow-x-auto pb-2 md:pb-0 gap-2 md:gap-0"
          >
            <button 
              onClick={() => setActiveTab("chat")}
              className={`flex-1 md:w-full flex items-center justify-center md:justify-start p-3 rounded-full transition-all whitespace-nowrap text-sm ${activeTab === "chat" ? "bg-white text-black" : "text-neutral-500 hover:text-white"}`}
            >
              <Users className="w-4 h-4 md:mr-2" />
              <span className="font-medium hidden md:inline">Group Chat</span>
            </button>
            <button 
              onClick={() => setActiveTab("checklist")}
              className={`flex-1 md:w-full flex items-center justify-center md:justify-start p-3 rounded-full transition-all whitespace-nowrap text-sm ${activeTab === "checklist" ? "bg-white text-black" : "text-neutral-500 hover:text-white"}`}
            >
              <ListTodo className="w-4 h-4 md:mr-2" />
              <span className="font-medium hidden md:inline">Checklist</span>
            </button>
            <button 
              onClick={() => setActiveTab("details")}
              className={`flex-1 md:w-full flex items-center justify-center md:justify-start p-3 rounded-full transition-all whitespace-nowrap text-sm ${activeTab === "details" ? "bg-white text-black" : "text-neutral-500 hover:text-white"}`}
            >
              <MapPin className="w-4 h-4 md:mr-2" />
              <span className="font-medium hidden md:inline">Logistics</span>
            </button>
          </motion.div>

          {/* Active View Area */}
          <motion.div 
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="md:col-span-3 flex flex-col overflow-hidden h-[600px] md:h-auto min-h-[500px]"
          >
            {/* --- GROUP CHAT TAB --- */}
            {activeTab === "chat" && (
              <div className="flex flex-col h-full w-full">
                <div className="flex-1 overflow-y-auto pr-2 space-y-4 mb-4 custom-scrollbar">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-neutral-500">
                      <Users className="w-12 h-12 mb-4 opacity-50" />
                      <p>No messages yet. Say hi!</p>
                    </div>
                  ) : (
                    messages.map((msg, i) => {
                      const isMe = profile && msg.userId === profile.id;
                      const showAvatar = i === messages.length - 1 || messages[i+1].userId !== msg.userId;
                      return (
                        <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"} items-end gap-2`}>
                          {!isMe && (
                            <div className="w-8 h-8 rounded-full bg-neutral-900 flex items-center justify-center text-sm flex-shrink-0 overflow-hidden">
                              {showAvatar ? (msg.avatar && msg.avatar.startsWith('http') ? <img src={msg.avatar} alt={msg.name} className="w-full h-full object-cover" /> : msg.avatar) : ""}
                            </div>
                          )}
                          <div className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                            {showAvatar && !isMe && <span className="text-xs text-neutral-500 mb-1 ml-1">{msg.name}</span>}
                            <div className={`px-4 py-2.5 rounded-2xl max-w-[280px] sm:max-w-md ${isMe ? "bg-white text-black rounded-br-sm" : "bg-neutral-900 text-white rounded-bl-sm"}`}>
                              {msg.text}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                  <div ref={chatEndRef} />
                </div>
                
                <form onSubmit={handleSendMessage} className="flex gap-2 mt-auto pt-4 border-t border-neutral-900">
                  <input 
                    type="text"
                    value={newMessageText}
                    onChange={(e) => setNewMessageText(e.target.value)}
                    placeholder="Message the group..." 
                    className="flex-1 bg-transparent border border-neutral-800 rounded-full px-5 py-3 text-white placeholder:text-neutral-600 focus:outline-none focus:border-white transition-all"
                  />
                  <Button 
                    type="submit" 
                    disabled={!newMessageText.trim()}
                    className="w-12 h-12 rounded-full bg-white hover:bg-neutral-200 text-black p-0 flex items-center justify-center flex-shrink-0"
                  >
                    <Send className="w-5 h-5 ml-1" />
                  </Button>
                </form>
              </div>
            )}

            {/* --- CHECKLIST TAB --- */}
            {activeTab === "checklist" && (
              <div className="flex flex-col h-full">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold mb-1">Checklist</h2>
                  <p className="text-neutral-400 text-sm">Coordinate who is bringing what.</p>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-3 mb-6 pr-2 custom-scrollbar">
                  {checklist.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-neutral-500 border border-neutral-900 border-dashed rounded-2xl">
                      Nothing on the list yet.
                    </div>
                  ) : (
                    checklist.map((item) => (
                      <div 
                        key={item.id} 
                        onClick={() => toggleChecklistItem(item.id, item.completed)}
                        className={`flex items-center p-4 rounded-xl cursor-pointer transition-all border ${item.completed ? "border-neutral-800 bg-neutral-900/30" : "border-neutral-900 hover:border-neutral-700"}`}
                      >
                        {item.completed ? (
                          <CheckCircle2 className="w-6 h-6 text-neutral-500 mr-4 flex-shrink-0" />
                        ) : (
                          <Circle className="w-6 h-6 text-neutral-600 mr-4 flex-shrink-0" />
                        )}
                        <span className={`flex-1 ${item.completed ? "text-neutral-500 line-through" : "text-white"}`}>
                          {item.text}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleAddChecklistItem} className="flex gap-3 mt-auto border-t border-neutral-900 pt-4">
                  <input 
                    type="text"
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    placeholder="Add an item..." 
                    className="flex-1 bg-transparent border border-neutral-800 rounded-full px-5 py-3 text-white placeholder:text-neutral-600 focus:outline-none focus:border-white transition-all"
                  />
                  <Button 
                    type="submit" 
                    disabled={!newItemText.trim()}
                    className="py-6 px-6 rounded-full bg-white hover:bg-neutral-200 text-black font-bold"
                  >
                    Add
                  </Button>
                </form>
              </div>
            )}

            {/* --- LOGISTICS TAB --- */}
            {activeTab === "details" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold mb-6">Event Logistics</h2>
                
                <div className="flex items-start text-neutral-300 border-b border-neutral-900 pb-5">
                  <Calendar className="w-6 h-6 text-white mr-4 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-lg font-medium text-white">
                      {event.time ? new Date(event.time).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'TBD'}
                    </p>
                    <p className="text-sm text-neutral-500">Date scheduled</p>
                  </div>
                </div>

                <div className="flex items-start text-neutral-300 border-b border-neutral-900 pb-5">
                  <Clock className="w-6 h-6 text-white mr-4 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-lg font-medium text-white">
                      {event.time ? new Date(event.time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : 'TBD'}
                    </p>
                    <p className="text-sm text-neutral-500">Meeting time</p>
                  </div>
                </div>

                <div className="flex items-start text-neutral-300 border-b border-neutral-900 pb-5">
                  <MapPin className="w-6 h-6 text-white mr-4 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-lg font-medium text-white">{event.venue || 'TBD'}</p>
                    <p className="text-sm text-neutral-500">Venue / Location</p>
                    {event.venue && (
                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.venue)}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-block mt-2 text-sm text-neutral-400 hover:text-white transition-colors"
                      >
                        Open in Maps ↗
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}
          </motion.div>

        </div>
      </div>
    </main>
  );
}
