import { useState, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface ShoppingListSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planData: any;
}

interface AggregatedItem {
  name: string;
  totalGrams: number;
  rawOrCooked: string;
  category: string;
  checked: boolean;
  displayUnit?: string;
  gramsPerUnit?: number;
}

const CATEGORY_ORDER = ["protein", "vegetables", "grains", "dairy", "fats", "other"];
const CATEGORY_LABELS: Record<string, string> = {
  protein: "Protein",
  vegetables: "Vegetables",
  grains: "Grains & Starches",
  dairy: "Dairy",
  fats: "Fats & Oils",
  other: "Other",
};

export function ShoppingListSheet({ open, onOpenChange, planData }: ShoppingListSheetProps) {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const aggregated = useMemo(() => {
    const map = new Map<string, AggregatedItem>();
    const days = planData?.days || [];

    for (const day of days) {
      for (const meal of day.meals || []) {
        for (const ing of meal.ingredients || []) {
          const key = `${ing.name.toLowerCase()}_${ing.raw_or_cooked}`;
          const existing = map.get(key);
          if (existing) {
            existing.totalGrams += ing.amount_grams;
          } else {
            map.set(key, {
              name: ing.name,
              totalGrams: ing.amount_grams,
              rawOrCooked: ing.raw_or_cooked,
              category: ing.category || "other",
              checked: false,
              displayUnit: ing.display_unit,
              gramsPerUnit: ing.display_unit && ing.display_unit !== "g" && ing.display_quantity
                ? ing.amount_grams / ing.display_quantity
                : undefined,
            });
          }
        }
      }
    }

    // Group by category
    const grouped: Record<string, AggregatedItem[]> = {};
    for (const item of map.values()) {
      const cat = item.category;
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    }

    return grouped;
  }, [planData]);

  const toggleItem = (key: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Shopping List</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-4">
          {CATEGORY_ORDER.filter((cat) => aggregated[cat]?.length).map((cat) => (
            <div key={cat} className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {CATEGORY_LABELS[cat] || cat}
              </p>
              <div className="space-y-1">
                {aggregated[cat].map((item) => {
                  const key = `${item.name.toLowerCase()}_${item.rawOrCooked}`;
                  const isChecked = checkedItems.has(key);
                  return (
                    <div
                      key={key}
                      className="flex items-center gap-3 py-1.5"
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => toggleItem(key)}
                      />
                      <span
                        className={cn(
                          "flex-1 text-sm",
                          isChecked && "line-through text-muted-foreground"
                        )}
                      >
                        {item.name}
                      </span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {item.displayUnit && item.displayUnit !== "g" && item.gramsPerUnit
                          ? `${Math.max(0.5, Math.round((item.totalGrams / item.gramsPerUnit) * 2) / 2)} ${item.displayUnit}`
                          : `${Math.round(item.totalGrams)}g (${item.rawOrCooked})`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {Object.keys(aggregated).length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">
              No ingredients in your plan yet.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
