import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MobileLayoutProps {
  children: ReactNode;
  className?: string;
  header?: ReactNode;
  footer?: ReactNode;
}

export function MobileLayout({ children, className, header, footer }: MobileLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {header && (
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/50 safe-top">
          {header}
        </header>
      )}
      <main className={cn("flex-1 overflow-auto", className)}>
        {children}
      </main>
      {footer && (
        <footer className="sticky bottom-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border/50 safe-bottom">
          {footer}
        </footer>
      )}
    </div>
  );
}
