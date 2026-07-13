"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserRepository } from "@/lib/repositories/UserRepository";
import { Button } from "@/components/ui/button";
import { Compass, Calendar, Wallet, CheckCircle } from "lucide-react";

interface OnboardingWizardProps {
  userId: string;
  onComplete: () => void;
}

const STEPS = [
  {
    id: "welcome",
    title: "Disconnect to Connect",
    description: "Welcome to Proxima. This is not another group chat or doom-scrolling feed. It's a tool built exclusively to manifest your digital intents into real-world hangouts.",
    icon: <Compass className="w-12 h-12 text-indigo-400 mb-6" />,
  },
  {
    id: "intent",
    title: "Drop an Intent",
    description: "Got an idea? 'Drinks tonight' or 'Tennis on Sunday'. Drop an Intent to your circle. Anyone who is down taps one button, and you instantly see who's interested.",
    icon: <CheckCircle className="w-12 h-12 text-green-400 mb-6" />,
  },
  {
    id: "planner",
    title: "The Hangout Planner",
    description: "Once people are in, transition your Intent to a Hangout Planner. Propose times and venues, let the group vote, and confirm the final plan without endless back-and-forth.",
    icon: <Calendar className="w-12 h-12 text-orange-400 mb-6" />,
  },
  {
    id: "ledger",
    title: "The Manual Ledger",
    description: "No platform fees. No holding your money. Use the Manual Ledger to handle costs organically. Attendees send money directly to your bank account, and you mark them as paid.",
    icon: <Wallet className="w-12 h-12 text-pink-400 mb-6" />,
  }
];

export function OnboardingWizard({ userId, onComplete }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);

  const handleNext = async () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(curr => curr + 1);
    } else {
      setIsCompleting(true);
      try {
        await UserRepository.completeOnboarding(userId);
        onComplete();
      } catch (error) {
        console.error("Failed to complete onboarding", error);
        setIsCompleting(false);
      }
    }
  };

  const step = STEPS[currentStep];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md px-4 sm:px-6">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-black to-pink-900/10 pointer-events-none" />
      
      <motion.div 
        layout
        className="w-full max-w-md bg-[#0a0a0a] border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden relative z-10"
      >
        <div className="p-8 sm:p-10 text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center"
            >
              {step.icon}
              <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">{step.title}</h2>
              <p className="text-neutral-400 text-sm leading-relaxed mb-8">
                {step.description}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="flex flex-col gap-4">
            <Button 
              onClick={handleNext}
              disabled={isCompleting}
              className="w-full py-6 bg-white hover:bg-neutral-200 text-black rounded-xl font-bold text-lg transition-all"
            >
              {isCompleting ? "Loading..." : currentStep === STEPS.length - 1 ? "Get Started" : "Continue"}
            </Button>
            
            {/* Progress indicators */}
            <div className="flex items-center justify-center gap-2 mt-4">
              {STEPS.map((_, idx) => (
                <div 
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentStep ? "w-6 bg-white" : "w-2 bg-neutral-800"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
