import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { PrimaryButton } from "@/components/ui";
import { TextEffect } from "@/components/motion/TextEffect";

interface LandingPageProps {
  onStartChat: () => void;
  onDashboard: () => void;
  onHowItWorks: () => void;
}

export function LandingPage({
  onStartChat,
  onDashboard,
  onHowItWorks,
}: LandingPageProps) {
  return (
    <>
      <Hero
        onStartChat={onStartChat}
        onDashboard={onDashboard}
        onHowItWorks={onHowItWorks}
      />
      <HowItWorks />

      {/* final CTA */}
      <section className="mx-auto max-w-6xl px-5 pb-28 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          className="relative overflow-hidden rounded-3xl border border-white/[0.07] bg-white/[0.02] px-8 py-16 text-center md:py-20"
        >
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 50% 60% at 50% 110%, rgba(228,109,50,0.10), transparent 70%)",
            }}
          />
          <div className="relative">
            <h2 className="font-display text-3xl font-semibold tracking-tight text-slate-100 md:text-4xl">
              <TextEffect text="Run your first diagnostic." stagger={0.035} />
            </h2>
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.15 }}
              className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-slate-400 md:text-base"
            >
              Ask about a vibration spike, a temperature drift, or twenty years
              of service history. The agent will show its work.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.25 }}
              className="mt-8"
            >
              <PrimaryButton onClick={onStartChat}>
                Start Chat Session
                <ArrowRight className="size-4" strokeWidth={2.2} />
              </PrimaryButton>
            </motion.div>
          </div>
        </motion.div>
      </section>
    </>
  );
}
