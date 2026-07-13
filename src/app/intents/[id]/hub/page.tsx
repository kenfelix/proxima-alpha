"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Intent, Hangout, PollOption, UserProfile } from "@/lib/types";
import { HangoutRepository } from "@/lib/repositories/HangoutRepository";
import { Share } from "lucide-react";
import { toast } from "sonner";
import { UserRepository } from "@/lib/repositories/UserRepository";

export default function HangoutPlannerPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const intentId = params.id as string;

  const [intent, setIntent] = useState<Intent | null>(null);
  const [hangout, setHangout] = useState<Hangout | null>(null);
  const [hostProfile, setHostProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // New Poll Form State
  const [newTime, setNewTime] = useState("");
  const [newVenue, setNewVenue] = useState("");

  useEffect(() => {
    async function loadData() {
      if (!intentId) return;
      
      const intentSnap = await getDoc(doc(db, "intents", intentId));
      if (!intentSnap.exists()) return;
      
      const intentData = { id: intentSnap.id, ...intentSnap.data() } as Intent;
      setIntent(intentData);

      // Check if hangout exists, if not, Host creates it implicitly
      const hangoutSnap = await getDoc(doc(db, "hangouts", intentId));
      if (hangoutSnap.exists()) {
        setHangout({ id: hangoutSnap.id, ...hangoutSnap.data() } as Hangout);
      } else if (user?.uid === intentData.creatorId) {
        // Create the initial hangout draft
        const newHangout: Hangout = {
          id: intentId,
          intentId: intentId,
          hostId: intentData.creatorId,
          title: intentData.activity,
          status: 'drafting',
          polls: [],
          pricingModel: 'free',
          attendees: [],
          presentAttendees: []
        };
        await HangoutRepository.createHangout(newHangout);
        setHangout(newHangout);
      }
      
      // Fetch Host Profile for Bank Details
      const hostData = await UserRepository.getUser(intentData.creatorId);
      setHostProfile(hostData);

      setLoading(false);
    }
    loadData();
  }, [intentId, user]);

  const handleAddPoll = async () => {
    if (!hangout || !newTime || !newVenue) return;
    const newPoll: PollOption = {
      id: Date.now().toString(),
      time: new Date(newTime).getTime(),
      venue: newVenue,
      votes: []
    };
    
    const hangoutRef = doc(db, "hangouts", hangout.id);
    await updateDoc(hangoutRef, {
      polls: arrayUnion(newPoll)
    });
    
    setHangout({
      ...hangout,
      polls: [...(hangout.polls || []), newPoll]
    });
    setNewTime("");
    setNewVenue("");
  };

  const handleVote = async (pollId: string) => {
    if (!user || !hangout) return;
    
    const updatedPolls = hangout.polls?.map(p => {
      if (p.id === pollId) {
        const hasVoted = p.votes.includes(user.uid);
        return {
          ...p,
          votes: hasVoted ? p.votes.filter(id => id !== user.uid) : [...p.votes, user.uid]
        };
      }
      return p;
    });

    const hangoutRef = doc(db, "hangouts", hangout.id);
    await updateDoc(hangoutRef, { polls: updatedPolls });
    setHangout({ ...hangout, polls: updatedPolls });
  };

  const handleConfirmPlan = async (pollId: string) => {
    if (!hangout || !intent) return;
    const winningPoll = hangout.polls?.find(p => p.id === pollId);
    if (!winningPoll) return;

    const hangoutRef = doc(db, "hangouts", hangout.id);
    await updateDoc(hangoutRef, {
      status: 'collecting_funds',
      confirmedTime: winningPoll.time,
      confirmedVenue: winningPoll.venue
    });

    setHangout({
      ...hangout,
      status: 'collecting_funds',
      confirmedTime: winningPoll.time,
      confirmedVenue: winningPoll.venue
    });

    // Send Resend Digest automatically
    try {
      const emails: string[] = [];
      for (const uid of intent.interestedUsers) {
        const p = await UserRepository.getUser(uid);
        if (p?.email) emails.push(p.email);
      }
      
      if (emails.length > 0) {
        const link = `${window.location.origin}/intents/${intent.id}/hub`;
        await fetch('/api/digest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            emails,
            title: hangout.title,
            time: winningPoll.time,
            venue: winningPoll.venue,
            link
          })
        });
      }
    } catch (e) {
      console.error("Failed to send digest", e);
    }

    // Send Web Push Notifications automatically
    try {
      if (user) {
        const tokens: string[] = [];
        for (const uid of intent.interestedUsers) {
          if (uid !== user.uid) { // Don't push to the host triggering it
            const p = await UserRepository.getUser(uid);
            if (p?.deviceTokens && Array.isArray(p.deviceTokens)) {
              tokens.push(...p.deviceTokens);
            }
          }
        }
        
        if (tokens.length > 0) {
          const link = `${window.location.origin}/intents/${intent.id}/hub`;
          await fetch('/api/push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tokens,
              title: "Plan Confirmed! 🎉",
              body: `The details for ${hangout.title} have been finalized.`,
              link
            })
          });
        }
      }
    } catch (e) {
      console.error("Failed to send push", e);
    }
  };

  const handleVerifyPayment = async (userId: string) => {
    if (!hangout) return;
    await HangoutRepository.addAttendee(hangout.id, userId);
    setHangout({
      ...hangout,
      attendees: [...(hangout.attendees || []), userId]
    });
  };

  const handleShare = () => {
    const url = `${window.location.origin}/intents/${intentId}`;
    if (navigator.share) {
      navigator.share({
        title: hangout?.title || "Hangout",
        url: url
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    }
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div></div>;
  if (!intent || !hangout) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Hangout not found.</div>;

  const isHost = user?.uid === hangout.hostId;

  return (
    <main className="min-h-screen bg-black text-white p-6 sm:p-12 font-sans">
      <div className="max-w-3xl mx-auto pt-10">
        <div className="mb-8 border-b border-neutral-900 pb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">
              Hangout Planner
            </h1>
            <p className="text-neutral-400 mt-2 font-medium">{hangout.title}</p>
          </div>
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
            <Button onClick={handleShare} variant="outline" className="rounded-full border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-white h-10 px-4 text-xs font-semibold">
              <Share className="w-4 h-4 mr-2" />
              Invite
            </Button>
            <div className="bg-neutral-900 px-4 py-2 rounded-full hidden sm:block">
              <span className="text-xs uppercase tracking-wider text-neutral-500 block">Status</span>
              <span className="font-semibold text-white">
                {hangout.status === 'drafting' ? 'Voting' : 'Funding'}
              </span>
            </div>
          </div>
        </div>

        {hangout.status === 'drafting' && (
          <div className="space-y-8">
            {isHost && (
              <div className="p-0 sm:p-0 mb-12">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                  Propose an Option
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <input 
                    type="datetime-local" 
                    value={newTime}
                    onChange={e => setNewTime(e.target.value)}
                    className="w-full bg-transparent border-b border-neutral-800 rounded-none px-0 py-3 focus:outline-none focus:border-white transition-all text-white [color-scheme:dark]"
                  />
                  <input 
                    placeholder="Venue (e.g. Central Park)" 
                    value={newVenue}
                    onChange={e => setNewVenue(e.target.value)}
                    className="w-full bg-transparent border-b border-neutral-800 rounded-none px-0 py-3 focus:outline-none focus:border-white transition-all text-white placeholder-neutral-700"
                  />
                </div>
                <Button onClick={handleAddPoll} className="w-full py-6 bg-white hover:bg-neutral-200 text-black rounded-full font-bold">
                  Add to Poll
                </Button>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Voting Options</h3>
              {hangout.polls?.length === 0 && <p className="text-neutral-500 text-sm bg-neutral-900/40 p-4 rounded-xl border border-neutral-800">No options proposed yet. Wait for the host.</p>}
              
              {hangout.polls?.map(poll => {
                const hasVoted = user && poll.votes.includes(user.uid);
                return (
                  <div key={poll.id} className="border border-neutral-900 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-neutral-700">
                    <div>
                      <p className="font-medium text-lg text-white">{new Date(poll.time).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                      <p className="text-neutral-400">{poll.venue}</p>
                      <div className="flex items-center gap-2 mt-3">
                        <div className="h-2 w-24 bg-neutral-900 rounded-full overflow-hidden">
                          <div className="h-full bg-white" style={{ width: `${Math.min(100, poll.votes.length * 20)}%` }}></div>
                        </div>
                        <p className="text-xs text-white font-semibold">{poll.votes.length} votes</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => handleVote(poll.id)}
                        className={`rounded-full px-6 py-6 font-semibold transition-all ${hasVoted ? 'bg-white hover:bg-neutral-200 text-black' : 'bg-neutral-900 hover:bg-neutral-800 text-white'}`}
                      >
                        {hasVoted ? 'Voted' : 'Vote'}
                      </Button>
                      
                      {isHost && (
                        <Button 
                          onClick={() => handleConfirmPlan(poll.id)}
                          className="bg-white hover:bg-neutral-200 text-black rounded-full px-6 py-6 font-semibold border border-neutral-800"
                        >
                          Confirm
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {hangout.status === 'collecting_funds' && (
          <div className="text-center relative">
            
            <div className="w-20 h-20 bg-neutral-900 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 className="text-3xl font-bold mb-3 tracking-tight text-white">Plan Confirmed!</h2>
            <p className="text-neutral-400 mb-12 text-lg">
              We are meeting on <span className="font-semibold text-white">{new Date(hangout.confirmedTime!).toLocaleString()}</span> at <span className="font-semibold text-white">{hangout.confirmedVenue}</span>.
            </p>
            
            <div className="border border-neutral-900 rounded-3xl p-6 text-left mb-6 relative z-10">
              <div className="flex items-center gap-3 mb-4 border-b border-neutral-900 pb-4">
                <div className="p-2 bg-neutral-900 rounded-lg">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h3 className="font-semibold text-xl text-white">The Purse (Manual Ledger)</h3>
              </div>
              <p className="text-neutral-400 text-sm mb-6 leading-relaxed">
                To secure your spot, please transfer your share directly to the host's account. The host will confirm your payment here.
              </p>
              
              {isHost ? (
                <div className="space-y-4">
                  <div className="border border-neutral-800 p-4 rounded-2xl">
                    <p className="text-sm text-white font-medium">Host Instructions:</p>
                    <p className="text-sm text-neutral-400 mt-1">Wait for attendees to send money. Once you confirm receipt in your bank app, mark them as paid below.</p>
                  </div>
                  
                  <div className="space-y-2 mt-4">
                    <h4 className="font-medium text-white mb-2">Pending Payments</h4>
                    {intent.interestedUsers.filter(uid => uid !== user.uid).map(uid => {
                      const hasPaid = hangout.attendees.includes(uid);
                      if (hasPaid) return null;
                      return (
                        <div key={uid} className="flex items-center justify-between border border-neutral-900 p-3 rounded-2xl">
                          <span className="text-sm text-neutral-300">User {uid.substring(0,6)}...</span>
                          <Button 
                            onClick={() => handleVerifyPayment(uid)}
                            size="sm"
                            className="bg-white hover:bg-neutral-200 text-black rounded-full px-4"
                          >
                            Mark Paid
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="bg-neutral-900 p-6 rounded-3xl text-center">
                  <p className="text-xs uppercase tracking-widest text-neutral-400 mb-2 font-bold">Host Bank Details</p>
                  {hostProfile?.hostPaymentDetails?.accountNumber ? (
                    <div className="space-y-2">
                      <p className="text-lg font-medium text-white">{hostProfile.hostPaymentDetails.bankName}</p>
                      <p className="text-2xl font-bold text-white tracking-wider">{hostProfile.hostPaymentDetails.accountNumber}</p>
                      <p className="text-neutral-400">{hostProfile.hostPaymentDetails.accountName}</p>
                    </div>
                  ) : (
                    <>
                      <p className="font-medium text-xl text-white mb-1">Awaiting details...</p>
                      <p className="text-sm text-neutral-500">The host has not linked their bank account yet.</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
