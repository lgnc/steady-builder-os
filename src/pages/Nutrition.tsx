import { motion } from "framer-motion";
import { Utensils } from "lucide-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { BottomNav } from "@/components/layout/BottomNav";

export default function NutritionPage() {
  return (
    <MobileLayout footer={<BottomNav />}>
      <div className="flex flex-col items-center justify-center h-full px-6 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-4"
        >
          <div className="p-4 rounded-full bg-primary/20 w-20 h-20 mx-auto flex items-center justify-center">
            <Utensils className="h-9 w-9 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Nutrition</h1>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto">
            Nutrition tracking is coming soon. You'll be able to view your daily fuel targets, macros, and pre/post-training guidance here.
          </p>
          <span className="inline-block text-xs font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
            Coming Soon
          </span>
        </motion.div>
      </div>
    </MobileLayout>
  );
}
