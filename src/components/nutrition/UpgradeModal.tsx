import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: string;
}

export function UpgradeModal({ open, onOpenChange, feature }: UpgradeModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            <DialogTitle>Pro Feature</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            <strong>{feature}</strong> is available on the Pro plan. Upgrade to unlock
            personalised nutrition features including food dislikes, cuisine preferences,
            and advanced macro adjustments.
          </DialogDescription>
        </DialogHeader>
        <Button variant="hero" className="w-full mt-2" onClick={() => onOpenChange(false)}>
          Coming Soon
        </Button>
      </DialogContent>
    </Dialog>
  );
}
