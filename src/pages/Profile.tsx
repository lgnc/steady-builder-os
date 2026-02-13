import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { User, LogOut, Calendar, Dumbbell, Moon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { WeeklyPerformanceCard, type WeeklyData } from "@/components/profile/WeeklyPerformanceCard";
import { WeeklyReviewModal } from "@/components/profile/WeeklyReviewModal";
import { Day28ReviewModal } from "@/components/profile/Day28ReviewModal";
import { Day28ReviewCard } from "@/components/profile/Day28ReviewCard";
import { Day28ResultsModal } from "@/components/profile/Day28ResultsModal";
import { useDay28Review } from "@/hooks/useDay28Review";

interface OnboardingData {
  wake_time: string;
  sleep_duration: number;
  bedtime: string;
  experience_tier: string;
  selected_program: string;
}

const programLabels: Record<string, string> = {
  "3_day_strength": "3-Day Strength",
  "4_day_strength": "4-Day Strength",
  "4_day_hybrid": "4-Day Hybrid",
  "5_day_hybrid": "5-Day Hybrid",
};

const experienceLabels: Record<string, string> = {
  absolute_amateur: "Amateur",
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export default function ProfilePage() {
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [weeklyData, setWeeklyData] = useState<WeeklyData | null>(null);
  const [day28Open, setDay28Open] = useState(false);
  const [day28ResultsOpen, setDay28ResultsOpen] = useState(false);
  
  const { user, signOut, loading: authLoading } = useAuth();
  const day28 = useDay28Review(user?.id);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      const { data } = await supabase
        .from("onboarding_data")
        .select("wake_time, sleep_duration, bedtime, experience_tier, selected_program")
        .eq("user_id", user.id)
        .single();

      if (data) setOnboardingData(data);
    };

    fetchData();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <MobileLayout footer={<BottomNav />}>
      <div className="px-6 py-6 space-y-8">
        {/* Header */}
        <header className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <User className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Profile</h1>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>
        </header>

        {/* Stats */}
        {onboardingData && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <h2 className="text-sm font-medium text-muted-foreground">Your Structure</h2>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="card-stat">
                <div className="flex items-center gap-2 mb-2">
                  <Moon className="h-4 w-4 text-info" />
                  <span className="text-xs text-muted-foreground">Sleep</span>
                </div>
                <p className="font-medium">{onboardingData.sleep_duration}h / night</p>
                <p className="text-xs text-muted-foreground">
                  {onboardingData.bedtime} → {onboardingData.wake_time}
                </p>
              </div>
              
              <div className="card-stat">
                <div className="flex items-center gap-2 mb-2">
                  <Dumbbell className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Program</span>
                </div>
                <p className="font-medium">
                  {programLabels[onboardingData.selected_program] || onboardingData.selected_program}
                </p>
                <p className="text-xs text-muted-foreground">
                  {experienceLabels[onboardingData.experience_tier] || onboardingData.experience_tier} tier
                </p>
              </div>
            </div>
          </motion.section>
        )}

        {/* 8 Week Commitment */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card-ritual"
        >
          <div className="flex items-center gap-3 mb-3">
            <Calendar className="h-5 w-5 text-primary" />
            <h3 className="font-medium">8 Week Commitment</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            You're locked into your current structure. No program hopping. Trust the process.
          </p>
        </motion.section>

        {/* Weekly Performance */}
        {user && (
          <WeeklyPerformanceCard
            userId={user.id}
            onOpenReview={() => setReviewOpen(true)}
            onDataLoaded={setWeeklyData}
          />
        )}

        <WeeklyReviewModal
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          data={weeklyData}
        />

        {/* 28-Day Review Card */}
        <Day28ReviewCard
          day28={day28}
          onOpenReview={() => setDay28Open(true)}
          onOpenResults={() => setDay28ResultsOpen(true)}
        />

        {/* Actions */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          <Button
            variant="outline"
            className="w-full justify-start gap-3"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </motion.section>

        {/* Footer */}
        <footer className="pt-8 text-center">
          <p className="text-xs text-muted-foreground">
            Betterment OS v1.0
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Structure. Execution. Consistency.
          </p>
        </footer>
      </div>
      {user && day28.trialStart && (
        <Day28ReviewModal
          open={day28Open || day28.shouldShow}
          onOpenChange={(open) => {
            setDay28Open(open);
            if (!open) day28.dismiss();
          }}
          userId={user.id}
          trialStart={day28.trialStart}
          onDismiss={day28.dismiss}
        />
      )}
      <Day28ResultsModal
        open={day28ResultsOpen}
        onOpenChange={setDay28ResultsOpen}
        data={day28.savedReview}
      />
    </MobileLayout>
  );
}
