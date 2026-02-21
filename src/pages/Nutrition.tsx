import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { BottomNav } from "@/components/layout/BottomNav";
import { NutritionSetup } from "@/components/nutrition/NutritionSetup";
import { DailyPlanView } from "@/components/nutrition/DailyPlanView";
import { WeeklyOverview } from "@/components/nutrition/WeeklyOverview";
import { ShoppingListSheet } from "@/components/nutrition/ShoppingListSheet";
import { UpgradeModal } from "@/components/nutrition/UpgradeModal";
import { Meal } from "@/components/nutrition/MealCard";
import { cn } from "@/lib/utils";
import { getWeekStartDate } from "@/lib/weekUtils";
import { Loader2, Lock, Sparkles } from "lucide-react";

type ViewTab = "daily" | "weekly";

export default function NutritionPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [plan, setPlan] = useState<any>(null);
  const [onboardingData, setOnboardingData] = useState<any>(null);
  const [completions, setCompletions] = useState<Record<string, boolean>>({});
  const [favourites, setFavourites] = useState<Set<string>>(new Set());
  const [swappingSlot, setSwappingSlot] = useState<string | null>(null);
  const [tab, setTab] = useState<ViewTab>("daily");
  const [shoppingOpen, setShoppingOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState("");

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch profile, latest plan, onboarding data, favourites in parallel
      const [profileRes, planRes, onbRes, favRes] = await Promise.all([
        supabase.from("nutrition_profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase
          .from("meal_plans")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("onboarding_data")
          .select("dietary_choices, allergies, sensitivities")
          .eq("user_id", user.id)
          .single(),
        supabase.from("favourite_meals").select("meal_data, meal_slot").eq("user_id", user.id),
      ]);

      setProfile(profileRes.data);
      setPlan(planRes.data);
      setOnboardingData(onbRes.data);

      // Build favourites set
      if (favRes.data) {
        const favSet = new Set<string>();
        favRes.data.forEach((f: any) => {
          const name = (f.meal_data as any)?.name;
          if (name) favSet.add(`${f.meal_slot}_${name}`);
        });
        setFavourites(favSet);
      }

      // Fetch completions for current plan
      if (planRes.data) {
        const { data: comps } = await supabase
          .from("meal_completions")
          .select("meal_date, meal_slot, completed")
          .eq("meal_plan_id", planRes.data.id)
          .eq("user_id", user.id);

        if (comps) {
          const map: Record<string, boolean> = {};
          comps.forEach((c: any) => {
            map[`${c.meal_date}_${c.meal_slot}`] = c.completed;
          });
          setCompletions(map);
        }
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleGenerate = async (mealsPerDay: number, dietaryFilters: string[], allergies: string) => {
    if (!user) return;
    setGenerating(true);

    try {
      // Update allergies in onboarding if changed
      if (allergies !== onboardingData?.allergies) {
        await supabase
          .from("onboarding_data")
          .update({ allergies: allergies || null } as any)
          .eq("user_id", user.id);
      }

      const { data, error } = await supabase.functions.invoke("generate-nutrition-plan", {
        body: { mealsPerDay, dietaryFilters },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: "Plan generated", description: "Your weekly meal plan is ready." });
      await fetchData();
    } catch (e: any) {
      toast({
        title: "Generation failed",
        description: e.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleToggleComplete = async (date: string, slot: string, completed: boolean) => {
    if (!user || !plan) return;

    const key = `${date}_${slot}`;
    setCompletions((prev) => ({ ...prev, [key]: completed }));

    try {
      if (completed) {
        await supabase.from("meal_completions").upsert(
          {
            user_id: user.id,
            meal_plan_id: plan.id,
            meal_date: date,
            meal_slot: slot,
            completed: true,
          },
          { onConflict: "user_id,meal_plan_id,meal_date,meal_slot" as any }
        );
      } else {
        await supabase
          .from("meal_completions")
          .delete()
          .eq("user_id", user.id)
          .eq("meal_plan_id", plan.id)
          .eq("meal_date", date)
          .eq("meal_slot", slot);
      }
    } catch {
      // Revert on failure
      setCompletions((prev) => ({ ...prev, [key]: !completed }));
    }
  };

  const handleSwapMeal = async (dayIndex: number, slot: string) => {
    if (!user || !plan) return;
    setSwappingSlot(slot);

    try {
      const { data, error } = await supabase.functions.invoke("swap-meal", {
        body: { mealPlanId: plan.id, dayIndex, mealSlot: slot },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: "Meal swapped" });
      await fetchData();
    } catch (e: any) {
      toast({
        title: "Swap failed",
        description: e.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSwappingSlot(null);
    }
  };

  const handleToggleFavourite = async (meal: Meal) => {
    if (!user) return;
    const key = `${meal.slot}_${meal.name}`;

    if (favourites.has(key)) {
      // Remove
      setFavourites((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      await supabase
        .from("favourite_meals")
        .delete()
        .eq("user_id", user.id)
        .eq("meal_slot", meal.slot);
    } else {
      // Add
      setFavourites((prev) => new Set(prev).add(key));
      await supabase.from("favourite_meals").insert({
        user_id: user.id,
        meal_data: meal as any,
        meal_slot: meal.slot,
      });
    }
  };

  const isExpired = plan?.expires_at && new Date(plan.expires_at) < new Date();
  const showSetup = !profile || !plan || isExpired;
  const currentWeekStart = getWeekStartDate(new Date());

  if (loading) {
    return (
      <MobileLayout footer={<BottomNav />}>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </MobileLayout>
    );
  }

  if (showSetup) {
    return (
      <MobileLayout footer={<BottomNav />}>
        {isExpired && (
          <div className="mx-6 mt-4 card-ritual flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            <p className="text-xs text-muted-foreground">
              Your 8-week plan has expired. Generate a new one to continue.
            </p>
          </div>
        )}
        <NutritionSetup
          onboardingDietaryChoices={onboardingData?.dietary_choices || []}
          onboardingAllergies={onboardingData?.allergies || ""}
          onGenerate={handleGenerate}
          loading={generating}
        />
      </MobileLayout>
    );
  }

  return (
    <MobileLayout footer={<BottomNav />}>
      <div className="px-4 py-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold tracking-tight">Nutrition</h1>
          <button
            onClick={() => {
              setUpgradeFeature("Customise Plan");
              setUpgradeOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
          >
            <Lock className="h-3 w-3" />
            Customise — Pro
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted/30 rounded-lg p-1">
          {(["daily", "weekly"] as ViewTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "flex-1 py-2 text-sm font-medium rounded-md transition-all duration-200",
                tab === t
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t === "daily" ? "Daily" : "Weekly"}
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === "daily" ? (
          <DailyPlanView
            planData={plan.plan_data}
            weekStart={currentWeekStart}
            profile={profile}
            completions={completions}
            favouriteSlots={favourites}
            swappingSlot={swappingSlot}
            onToggleComplete={handleToggleComplete}
            onSwapMeal={handleSwapMeal}
            onToggleFavourite={handleToggleFavourite}
            onCustomise={() => {
              setUpgradeFeature("Customise Meals");
              setUpgradeOpen(true);
            }}
          />
        ) : (
          <WeeklyOverview
            planData={plan.plan_data}
            weekStart={currentWeekStart}
            completions={completions}
            mealsPerDay={profile.meals_per_day}
            onOpenShoppingList={() => setShoppingOpen(true)}
          />
        )}
      </div>

      <ShoppingListSheet
        open={shoppingOpen}
        onOpenChange={setShoppingOpen}
        planData={plan.plan_data}
      />

      <UpgradeModal
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        feature={upgradeFeature}
      />
    </MobileLayout>
  );
}
