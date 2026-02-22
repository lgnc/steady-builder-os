import { motion } from "framer-motion";
import { BookOpen, Users, ExternalLink, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Resource {
  icon: LucideIcon;
  title: string;
  description: string;
  url: string;
}

const resources: Resource[] = [
  {
    icon: Sparkles,
    title: "Peak Performance Protocol",
    description: "The full program overview and methodology",
    url: "https://example.com/protocol",
  },
  {
    icon: Users,
    title: "Join the Community",
    description: "Connect with others on the same path",
    url: "https://example.com/community",
  },
  {
    icon: BookOpen,
    title: "Training Guides",
    description: "Deep dives on technique, recovery & progression",
    url: "https://example.com/guides",
  },
  {
    icon: ExternalLink,
    title: "Weekly Newsletter",
    description: "Curated insights delivered every Monday",
    url: "https://example.com/newsletter",
  },
];

const BonusMaterial = () => {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.4 }}
      className="space-y-3 opacity-80"
    >
      <h2 className="text-sm font-medium text-muted-foreground tracking-wide uppercase">
        Go Deeper
      </h2>
      <div className="space-y-2">
        {resources.map((resource) => {
          const Icon = resource.icon;
          return (
            <a
              key={resource.title}
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="card-stat flex items-center gap-3 hover:border-border/60 transition-colors"
            >
              <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{resource.title}</p>
                <p className="text-xs text-muted-foreground truncate">{resource.description}</p>
              </div>
            </a>
          );
        })}
      </div>
    </motion.section>
  );
};

export default BonusMaterial;
