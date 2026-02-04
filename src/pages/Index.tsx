import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Target, Calendar, Brain, Zap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import heroPattern from "@/assets/hero-pattern.jpg";

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  const features = [
    {
      icon: Calendar,
      title: "Structured Schedule",
      description: "Wake, train, work, rest—all time-blocked automatically.",
    },
    {
      icon: Target,
      title: "Locked Programs",
      description: "8 weeks. No program hopping. Trust the process.",
    },
    {
      icon: Brain,
      title: "Daily Rituals",
      description: "Morning primers. Evening reflections. Non-negotiable.",
    },
    {
      icon: Zap,
      title: "Decision Reduction",
      description: "Stop deciding. Start executing.",
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroPattern}
          alt=""
          className="w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background" />
      </div>

      {/* Header */}
      <header className="relative z-10 px-6 py-6 flex items-center justify-between">
        <motion.h1
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-xl font-semibold tracking-tight"
        >
          Betterment OS
        </motion.h1>
        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
          <Button variant="ghost" onClick={() => navigate("/auth")}>
            Sign in
          </Button>
        </motion.div>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex-1 px-6 py-12 flex flex-col justify-center max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-6"
        >
          <div className="space-y-4">
            <h2 className="text-4xl font-bold tracking-tight leading-tight">
              Install structure.
              <br />
              <span className="text-gradient">Execute consistently.</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              A life operating system that removes decisions and makes execution inevitable.
              Built for men who are done starting over.
            </p>
          </div>

          <Button
            variant="hero"
            size="xl"
            className="w-full sm:w-auto"
            onClick={() => navigate("/auth")}
          >
            Start Your 8 Weeks
            <ArrowRight className="h-5 w-5" />
          </Button>

          <p className="text-xs text-muted-foreground">
            No credit card required. No motivation needed. Just structure.
          </p>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-16 grid grid-cols-2 gap-4"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
              className="card-ritual"
            >
              <feature.icon className="h-5 w-5 text-primary mb-3" />
              <h3 className="font-medium text-sm mb-1">{feature.title}</h3>
              <p className="text-xs text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-8 text-center border-t border-border/50">
        <p className="text-sm text-muted-foreground mb-2">
          "Discipline equals freedom."
        </p>
        <p className="text-xs text-muted-foreground">
          Structure. Execution. Consistency.
        </p>
      </footer>
    </div>
  );
}
