import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Utensils, 
  Flame, 
  Beef, 
  Wheat, 
  Droplet,
  Target,
  RefreshCw,
  Zap
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NutritionData {
  heightCm: number | null;
  weightKg: number | null;
  targetWeightKg: number | null;
  activityLevel: string;
  calorieTarget: number | null;
  proteinTarget: number | null;
  carbTarget: number | null;
  fatTarget: number | null;
  primaryGoals: string[];
}

const activityMultipliers: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very_active: 1.725,
};

export default function NutritionPage() {
  const [nutritionData, setNutritionData] = useState<NutritionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  
  const { user, loading: authLoading } = useAuth();
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
        .select(
          "height_cm, weight_kg, target_weight_kg, activity_level, calorie_target, protein_target, carb_target, fat_target, primary_goals"
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setNutritionData({
          heightCm: data.height_cm,
          weightKg: data.weight_kg,
          targetWeightKg: data.target_weight_kg,
          activityLevel: data.activity_level || "moderate",
          calorieTarget: data.calorie_target,
          proteinTarget: data.protein_target,
          carbTarget: data.carb_target,
          fatTarget: data.fat_target,
          primaryGoals: data.primary_goals || [],
        });
      }

      setLoading(false);
    };

    fetchData();
  }, [user]);

  const calculateTargets = async () => {
    if (!user || !nutritionData?.heightCm || !nutritionData?.weightKg) return;

    setCalculating(true);

    // Mifflin-St Jeor equation for BMR (assumes male)
    const bmr = 10 * nutritionData.weightKg + 6.25 * nutritionData.heightCm - 5 * 30 + 5;
    const activityMultiplier = activityMultipliers[nutritionData.activityLevel] || 1.55;
    let tdee = Math.round(bmr * activityMultiplier);

    // Adjust for goals
    const hasFatLoss = nutritionData.primaryGoals.includes("fat_loss");
    const hasMuscleGain = nutritionData.primaryGoals.includes("muscle_gain");

    if (hasFatLoss) {
      tdee = Math.round(tdee * 0.8); // 20% deficit
    } else if (hasMuscleGain) {
      tdee = Math.round(tdee * 1.1); // 10% surplus
    }

    // Calculate macros
    const protein = Math.round(nutritionData.weightKg * 2.2); // 2.2g per kg
    const fat = Math.round((tdee * 0.25) / 9); // 25% of calories from fat
    const carbs = Math.round((tdee - protein * 4 - fat * 9) / 4); // Remaining from carbs

    // Save to database
    await supabase
      .from("onboarding_data")
      .update({
        calorie_target: tdee,
        protein_target: protein,
        carb_target: carbs,
        fat_target: fat,
      })
      .eq("user_id", user.id);

    setNutritionData((prev) =>
      prev
        ? {
            ...prev,
            calorieTarget: tdee,
            proteinTarget: protein,
            carbTarget: carbs,
            fatTarget: fat,
          }
        : null
    );

    setCalculating(false);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const hasTargets = nutritionData?.calorieTarget && nutritionData?.proteinTarget;
  const hasData = nutritionData?.heightCm && nutritionData?.weightKg;

  return (
    <MobileLayout footer={<BottomNav />}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-6 py-6 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Utensils className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Nutrition</h1>
              <p className="text-sm text-muted-foreground">
                Your daily fuel targets
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto px-6 py-6">
          {!hasData ? (
            <div className="text-center py-12">
              <div className="p-4 rounded-full bg-muted/50 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Target className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-medium mb-2">No data yet</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Complete onboarding with your height and weight to calculate targets.
              </p>
              <Button variant="outline" onClick={() => navigate("/onboarding")}>
                Complete Onboarding
              </Button>
            </div>
          ) : !hasTargets ? (
            <div className="text-center py-12">
              <div className="p-4 rounded-full bg-primary/20 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Zap className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-lg font-medium mb-2">Ready to calculate</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Based on your stats ({nutritionData.weightKg}kg, {nutritionData.heightCm}cm) 
                and goals, we'll generate your targets.
              </p>
              <Button
                variant="hero"
                onClick={calculateTargets}
                disabled={calculating}
                className="gap-2"
              >
                {calculating ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Calculating...
                  </>
                ) : (
                  <>
                    <Target className="h-4 w-4" />
                    Calculate Targets
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Calories */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-primary/30">
                    <Flame className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-sm text-muted-foreground">Daily Calories</span>
                </div>
                <div className="text-4xl font-bold">
                  {nutritionData.calorieTarget?.toLocaleString()}
                  <span className="text-lg font-normal text-muted-foreground ml-2">
                    kcal
                  </span>
                </div>
              </motion.div>

              {/* Macros Grid */}
              <div className="grid grid-cols-3 gap-3">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="p-4 rounded-lg bg-muted/30 border border-border/50 text-center"
                >
                  <div className="p-2 rounded-lg bg-red-500/20 w-fit mx-auto mb-2">
                    <Beef className="h-4 w-4 text-red-400" />
                  </div>
                  <div className="text-2xl font-bold">{nutritionData.proteinTarget}g</div>
                  <span className="text-xs text-muted-foreground">Protein</span>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="p-4 rounded-lg bg-muted/30 border border-border/50 text-center"
                >
                  <div className="p-2 rounded-lg bg-amber-500/20 w-fit mx-auto mb-2">
                    <Wheat className="h-4 w-4 text-amber-400" />
                  </div>
                  <div className="text-2xl font-bold">{nutritionData.carbTarget}g</div>
                  <span className="text-xs text-muted-foreground">Carbs</span>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="p-4 rounded-lg bg-muted/30 border border-border/50 text-center"
                >
                  <div className="p-2 rounded-lg bg-blue-500/20 w-fit mx-auto mb-2">
                    <Droplet className="h-4 w-4 text-blue-400" />
                  </div>
                  <div className="text-2xl font-bold">{nutritionData.fatTarget}g</div>
                  <span className="text-xs text-muted-foreground">Fat</span>
                </motion.div>
              </div>

              {/* Tips */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="space-y-3"
              >
                <h3 className="text-sm font-medium text-muted-foreground">Daily Guidelines</h3>
                
                <div className="card-ritual">
                  <h4 className="font-medium text-sm mb-1">Pre-Training</h4>
                  <p className="text-xs text-muted-foreground">
                    {Math.round((nutritionData.carbTarget || 0) * 0.3)}g carbs + 20g protein, 
                    60-90 min before training
                  </p>
                </div>

                <div className="card-ritual">
                  <h4 className="font-medium text-sm mb-1">Post-Training</h4>
                  <p className="text-xs text-muted-foreground">
                    {Math.round((nutritionData.proteinTarget || 0) * 0.3)}g protein + 
                    {Math.round((nutritionData.carbTarget || 0) * 0.25)}g carbs within 2 hours
                  </p>
                </div>
              </motion.div>

              {/* Recalculate */}
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={calculateTargets}
                disabled={calculating}
              >
                <RefreshCw className={cn("h-4 w-4", calculating && "animate-spin")} />
                Recalculate Targets
              </Button>
            </div>
          )}
        </div>
      </div>
    </MobileLayout>
  );
}
