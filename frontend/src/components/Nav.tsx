import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Menu, Workflow, X } from "lucide-react";
import { cn } from "@/utils/cn";
import type { Route } from "@/lib/routing";

interface NavProps {
  route: Route;
  onNavigate: (route: Route) => void;
  onHowItWorks: () => void;
}

const links: { id: Route; label: string }[] = [
  { id: "home", label: "Overview" },
  { id: "chat", label: "Chat" },
  { id: "dashboard", label: "Dashboard" },
];

export function Nav({ route, onNavigate, onHowItWorks }: NavProps) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [route]);

  return (
    <motion.header
      initial={{ y: -28, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
      className={cn(
        "app-nav fixed inset-x-0 top-0 z-40 transition-[background-color,border-color] duration-500",
        scrolled
          ? "border-b border-white/[0.06] bg-[#0b0f14]/80 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 md:px-8">
        <button
          onClick={() => onNavigate("home")}
          className="group flex items-center gap-2.5"
          aria-label="Agentic RAG home"
        >
          <span className="grid size-8 place-items-center rounded-lg border border-white/10 bg-white/[0.04] transition-colors duration-300 group-hover:border-white/20">
            <Workflow className="size-4 text-slate-300" strokeWidth={1.8} />
          </span>
          <span className="text-left leading-tight">
            <span className="block font-display text-sm font-semibold tracking-tight text-slate-100">
              Agentic RAG
            </span>
            <span className="block font-mono text-[10px] tracking-wide text-slate-500">
              local inference
            </span>
          </span>
        </button>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {links.map((link) => (
            <button
              key={link.id}
              onClick={() => onNavigate(link.id)}
              className={cn(
                "relative rounded-full px-4 py-2 text-sm transition-colors duration-300",
                route === link.id
                  ? "text-slate-100"
                  : "text-slate-400 hover:text-slate-200",
              )}
            >
              {route === link.id && (
                <motion.span
                  layoutId="nav-pill"
                  transition={{ type: "spring", stiffness: 240, damping: 26 }}
                  className="absolute inset-0 rounded-full border border-white/10 bg-white/[0.05]"
                />
              )}
              <span className="relative">{link.label}</span>
            </button>
          ))}
          <button
            onClick={onHowItWorks}
            className="rounded-full px-4 py-2 text-sm text-slate-400 transition-colors duration-300 hover:text-slate-200"
          >
            How It Works
          </button>
        </nav>

        <button
          className="grid size-9 place-items-center rounded-lg border border-white/10 text-slate-300 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 170, damping: 24 }}
            className="overflow-hidden border-b border-white/[0.06] bg-[#0b0f14]/95 backdrop-blur-xl md:hidden"
            aria-label="Mobile"
          >
            <div className="space-y-1 px-5 py-4">
              {links.map((link) => (
                <button
                  key={link.id}
                  onClick={() => onNavigate(link.id)}
                  className={cn(
                    "block w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                    route === link.id
                      ? "bg-white/[0.05] text-slate-100"
                      : "text-slate-400 hover:text-slate-200",
                  )}
                >
                  {link.label}
                </button>
              ))}
              <button
                onClick={onHowItWorks}
                className="block w-full rounded-lg px-3 py-2.5 text-left text-sm text-slate-400 transition-colors hover:text-slate-200"
              >
                How It Works
              </button>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
