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
import { NotificationService } from "@/lib/services/NotificationService";

export default function HangoutPlannerPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const intentId = params.id as string;

  const [intent, setIntent] = useState<Intent | null>(null);
  const [hangout, setHangout] = useState<Hangout | null>(null);
  const [hostProfile, setHostProfile] = useState<UserProfile | null>(null);
  const [interestedProfiles, setInterestedProfiles] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState(true);

  // New Poll Form State
  const [newTime, setNewTime] = useState("");
  const [newVenue, setNewVenue] = useState("");

  // Pricing Modal State
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [selectedPollId, setSelectedPollId] = useState<string | null>(null);
  const [pricingModel, setPricingModel] = useState<'free' | 'per_person' | 'split_total'>('free');
  const [pricingValue, setPricingValue] = useState("");
  const [currency, setCurrency] = useState("$");

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

      // Fetch profiles of interested users
      const profiles: Record<string, UserProfile> = {};
      for (const uid of intentData.interestedUsers) {
        const p = await UserRepository.getUser(uid);
        if (p) profiles[uid] = p;
      }
      setInterestedProfiles(profiles);

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
    if (!user || !hangout || !intent) return;
    
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

    // Notify interested users that someone voted
    try {
      const otherUsers = intent.interestedUsers.filter(uid => uid !== user.uid);
      if (otherUsers.length > 0) {
        await NotificationService.sendNotification(
          otherUsers,
          "New Vote! 🗳️",
          `Someone just voted on the plan for ${intent.activity}. Check the Hub!`,
          `${window.location.origin}/intents/${intent.id}/hub`,
          'vote'
        );
      }
    } catch (e) {
      console.error("Failed to send vote push notification", e);
    }
  };

  const handleConfirmPlan = (pollId: string) => {
    setSelectedPollId(pollId);
    setShowPricingModal(true);
  };

  const handleFinalizePlan = async () => {
    if (!hangout || !intent || !selectedPollId) return;
    const winningPoll = hangout.polls?.find(p => p.id === selectedPollId);
    if (!winningPoll) return;

    let perPersonCost = 0;
    let totalCost = 0;
    const numPeople = intent.interestedUsers.length;
    const parsedValue = parseFloat(pricingValue) || 0;

    if (pricingModel === 'per_person') {
      perPersonCost = parsedValue;
    } else if (pricingModel === 'split_total') {
      totalCost = parsedValue;
      perPersonCost = numPeople > 0 ? totalCost / numPeople : totalCost;
    }

    const nextStatus = pricingModel === 'free' ? 'confirmed' : 'collecting_funds';

    const hangoutRef = doc(db, "hangouts", hangout.id);
    await updateDoc(hangoutRef, {
      status: nextStatus,
      confirmedTime: winningPoll.time,
      confirmedVenue: winningPoll.venue,
      pricingModel,
      perPersonCost,
      totalCost,
      currency
    });

    setHangout({
      ...hangout,
      status: nextStatus,
      confirmedTime: winningPoll.time,
      confirmedVenue: winningPoll.venue,
      pricingModel,
      perPersonCost,
      totalCost,
      currency
    });

    setShowPricingModal(false);

    // Send Notifications (In-App, Push, and Email Digest)
    try {
      if (user) {
        const otherUsers = intent.interestedUsers.filter(uid => uid !== user.uid);
        if (otherUsers.length > 0) {
          const link = `${window.location.origin}/intents/${intent.id}/hub`;
          await NotificationService.sendNotification(
            otherUsers,
            "Plan Confirmed! 🎉",
            `The details for ${hangout.title} have been finalized.`,
            link,
            'system',
            true, // sendEmailDigest
            {
              title: hangout.title,
              time: winningPoll.time,
              venue: winningPoll.venue
            }
          );
        }
      }
    } catch (e) {
      console.error("Failed to send finalization notifications", e);
    }
  };

  const handleVerifyPayment = async (userId: string) => {
    if (!hangout) return;
    await HangoutRepository.addAttendee(hangout.id, userId);

    const hangoutRef = doc(db, "hangouts", hangout.id);
    const updatedPending = (hangout.pendingPayments || []).filter(id => id !== userId);
    await updateDoc(hangoutRef, {
      pendingPayments: updatedPending
    });

    // Mutual connection with all other paid attendees
    const currentAttendees = hangout.attendees || [];
    for (const otherUid of currentAttendees) {
      if (otherUid !== userId) {
        await UserRepository.addConnection(userId, otherUid);
        await UserRepository.addConnection(otherUid, userId);
      }
    }

    setHangout({
      ...hangout,
      attendees: [...currentAttendees, userId],
      pendingPayments: updatedPending
    });

    // Notify the user that their payment was verified
    try {
      await NotificationService.sendNotification(
        [userId],
        "Payment Verified! 💸",
        `Your spot for ${hangout.title} is officially secured.`,
        `${window.location.origin}/intents/${hangout.id}/hub`,
        'payment'
      );
    } catch (e) {
      console.error("Failed to notify user of payment verification", e);
    }
  };

  const handleClaimPayment = async () => {
    if (!hangout || !user) return;
    
    const hangoutRef = doc(db, "hangouts", hangout.id);
    await updateDoc(hangoutRef, {
      pendingPayments: arrayUnion(user.uid)
    });

    const currentPending = hangout.pendingPayments || [];
    setHangout({
      ...hangout,
      pendingPayments: [...currentPending, user.uid]
    });

    try {
      const myProfile = interestedProfiles[user.uid];
      await NotificationService.sendNotification(
        [hangout.hostId],
        "Payment Claimed! 💸",
        `${myProfile?.name || 'Someone'} claims they've paid for ${hangout.title}. Check your ledger.`,
        `${window.location.origin}/intents/${hangout.id}/hub`,
        'payment'
      );
    } catch (e) {
      console.error("Failed to notify host", e);
    }
  };

  const handleRejectPayment = async (userId: string) => {
    if (!hangout) return;
    
    const hangoutRef = doc(db, "hangouts", hangout.id);
    const updatedPending = (hangout.pendingPayments || []).filter(id => id !== userId);
    
    await updateDoc(hangoutRef, {
      pendingPayments: updatedPending
    });

    setHangout({
      ...hangout,
      pendingPayments: updatedPending
    });

    try {
      await NotificationService.sendNotification(
        [userId],
        "Payment Verification Failed ❌",
        `Your payment for ${hangout.title} could not be verified. Please contact the host or try again.`,
        `${window.location.origin}/intents/${hangout.id}/hub`,
        'payment'
      );
    } catch (e) {
      console.error("Failed to notify user", e);
    }
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
              {hangout.pricingModel !== 'free' && (
                <div className="bg-neutral-900/50 p-4 rounded-2xl mb-6 border border-neutral-800">
                  <div className="flex justify-between items-center mb-4 pb-4 border-b border-neutral-800">
                    <span className="text-neutral-300 font-medium">Total Collected:</span>
                    <span className="text-2xl font-bold text-green-400">{hangout.currency || '$'}{(hangout.attendees?.length || 0) * (hangout.perPersonCost || 0)}</span>
                  </div>
                  {hangout.pricingModel === 'per_person' ? (
                    <p className="text-white font-medium">Cost per person: <span className="text-xl font-bold">{hangout.currency || '$'}{hangout.perPersonCost}</span></p>
                  ) : (
                    <div>
                      <p className="text-neutral-300 text-sm mb-1">Total Cost: <span className="text-white font-semibold">{hangout.currency || '$'}{hangout.totalCost}</span> (Split among {intent?.interestedUsers.length} people)</p>
                      <p className="text-white font-medium">Your Share: <span className="text-xl font-bold">{hangout.currency || '$'}{hangout.perPersonCost}</span></p>
                    </div>
                  )}
                </div>
              )}
              
              <p className="text-neutral-400 text-sm mb-6 leading-relaxed">
                To secure your spot, please transfer your share directly to the host's account. The host will confirm your payment here.
              </p>
              
              {isHost ? (
                <div className="space-y-4">
                  <div className="border border-neutral-800 p-4 rounded-2xl">
                    <p className="text-sm text-white font-medium">Host Instructions:</p>
                    <p className="text-sm text-neutral-400 mt-1">Wait for attendees to send money. Once you confirm receipt in your bank app, mark them as paid below. (You can also mark yourself as paid to add your share to the total).</p>
                  </div>
                  
                  <div className="space-y-2 mt-4">
                    <h4 className="font-medium text-white mb-4">Attendee Ledger</h4>
                    {intent.interestedUsers.map(uid => {
                      const hasPaid = hangout.attendees?.includes(uid);
                      const isPending = hangout.pendingPayments?.includes(uid);
                      
                      return (
                        <div key={uid} className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                          hasPaid ? "border-green-500/20 bg-green-500/5" : 
                          isPending ? "border-amber-500/50 bg-amber-500/10" : 
                          "border-neutral-900"
                        }`}>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-white">
                              {interestedProfiles[uid]?.name || `User ${uid.substring(0,6)}...`}
                            </span>
                            <span className={`text-xs ${
                              hasPaid ? "text-green-400" : 
                              isPending ? "text-amber-400 font-semibold" : 
                              "text-neutral-500"
                            }`}>
                              {hasPaid ? "Payment Verified" : isPending ? "Verification Pending" : "Awaiting Payment"}
                            </span>
                          </div>
                          
                          {!hasPaid && (
                            <div className="flex gap-2">
                              {isPending && (
                                <Button 
                                  onClick={() => handleRejectPayment(uid)}
                                  size="sm"
                                  className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-full px-3"
                                >
                                  Reject
                                </Button>
                              )}
                              <Button 
                                onClick={() => handleVerifyPayment(uid)}
                                size="sm"
                                className={isPending ? "bg-amber-500 hover:bg-amber-400 text-black rounded-full px-4 font-bold" : "bg-white hover:bg-neutral-200 text-black rounded-full px-4"}
                              >
                                Verify
                              </Button>
                            </div>
                          )}
                          {hasPaid && (
                            <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
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
                  
                  {hangout.attendees?.includes(user?.uid || '') ? (
                    <div className="bg-green-500/10 border border-green-500/30 p-4 rounded-2xl flex items-center justify-center gap-2">
                      <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      <p className="text-green-400 font-semibold">Payment Confirmed! 🎉</p>
                    </div>
                  ) : hangout.pendingPayments?.includes(user?.uid || '') ? (
                    <Button 
                      disabled
                      className="w-full py-6 bg-neutral-800 text-neutral-400 rounded-full font-bold opacity-80"
                    >
                      Verification Pending...
                    </Button>
                  ) : (
                    <Button 
                      onClick={handleClaimPayment}
                      className="w-full py-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-bold shadow-lg shadow-indigo-600/20"
                    >
                      I've Sent the Money
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        {showPricingModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-neutral-950 border border-neutral-800 rounded-3xl p-6 w-full max-w-md">
              <h3 className="text-2xl font-bold text-white mb-2">Funding this Hangout</h3>
              <p className="text-neutral-400 text-sm mb-6">How are we splitting the bill?</p>
              
              <div className="space-y-3 mb-6">
                <button 
                  onClick={() => { setPricingModel('free'); setPricingValue(""); }}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${pricingModel === 'free' ? 'border-white bg-white/5' : 'border-neutral-800 hover:border-neutral-600'}`}
                >
                  <p className="font-semibold text-white">Free</p>
                  <p className="text-xs text-neutral-500 mt-1">Just hanging out. No money involved.</p>
                </button>

                <button 
                  onClick={() => setPricingModel('per_person')}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${pricingModel === 'per_person' ? 'border-white bg-white/5' : 'border-neutral-800 hover:border-neutral-600'}`}
                >
                  <p className="font-semibold text-white">Per Head</p>
                  <p className="text-xs text-neutral-500 mt-1">Everyone pays a fixed fee (e.g. {currency}5 gate fee).</p>
                </button>

                <button 
                  onClick={() => setPricingModel('split_total')}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${pricingModel === 'split_total' ? 'border-white bg-white/5' : 'border-neutral-800 hover:border-neutral-600'}`}
                >
                  <p className="font-semibold text-white">Split Total</p>
                  <p className="text-xs text-neutral-500 mt-1">Set a total goal. We divide it by {intent?.interestedUsers.length} people.</p>
                </button>
              </div>

              {pricingModel !== 'free' && (
                <div className="mb-6">
                  <label className="text-xs text-neutral-500 uppercase tracking-wider mb-2 block font-semibold">
                    {pricingModel === 'per_person' ? 'Cost Per Person' : 'Total Cost'}
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-3 text-white focus:outline-none focus:border-white transition-all text-lg min-w-[70px] appearance-none"
                    >
                      <option value="$">$</option>
                      <option value="€">€</option>
                      <option value="£">£</option>
                      <option value="₦">₦</option>
                      <option value="₹">₹</option>
                    </select>
                    <input 
                      type="number" 
                      value={pricingValue} 
                      onChange={(e) => setPricingValue(e.target.value)}
                      placeholder="0.00"
                      className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white transition-all text-lg"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button 
                  onClick={() => setShowPricingModal(false)}
                  className="flex-1 py-6 bg-neutral-900 hover:bg-neutral-800 text-white rounded-full font-bold"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleFinalizePlan}
                  className="flex-1 py-6 bg-white hover:bg-neutral-200 text-black rounded-full font-bold"
                >
                  Confirm Plan
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
