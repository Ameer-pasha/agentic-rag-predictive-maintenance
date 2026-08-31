import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { uid } from "@/lib/api";
import { navigate, parseHash, type Route } from "@/lib/routing";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { LandingPage } from "@/pages/LandingPage";
import { ChatPage, type ChatDraft } from "@/pages/ChatPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { SPRING } from "@/components/ui";

export default function App() {
  const [route, setRoute] = useState<Route>(() => parseHash());
  const [chatDraft, setChatDraft] = useState<ChatDraft | null>(null);
  const [focusMachine, setFocusMachine] = useState<string | null>(null);

  useEffect(() => {
    const onHashChange = () => {
      setRoute(parseHash());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const go = useCallback((r: Route) => navigate(r), []);

  const howItWorks = useCallback(() => {
    const scroll = () =>
      document
        .getElementById("how-it-works")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (parseHash() !== "home") {
      navigate("home");
      window.setTimeout(scroll, 500);
    } else {
      scroll();
    }
  }, []);

  /** Jump from chat/escalations straight into a machine's dashboard panel. */
  const openMachine = useCallback((id: string) => {
    setFocusMachine(id);
    navigate("dashboard");
  }, []);

  /** Hand a machine to the agent as a pre-filled chat prompt. */
  const askAbout = useCallback((id: string) => {
    setChatDraft({
      key: uid(),
      text: `What is the current status of machine ${id}? Check its live sensor values and recent history.`,
    });
    navigate("chat");
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-svh bg-[#ead7bb] text-[#3d291c]">
        <Nav route={route} onNavigate={go} onHowItWorks={howItWorks} />

      <AnimatePresence mode="wait">
        <motion.main
          key={route}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -14, transition: { duration: 0.22, ease: "easeIn" } }}
          transition={SPRING}
        >
          {route === "home" && (
            <LandingPage
              onStartChat={() => go("chat")}
              onDashboard={() => go("dashboard")}
              onHowItWorks={howItWorks}
            />
          )}
          {route === "chat" && (
            <ChatPage
              draft={chatDraft}
              onDraftConsumed={() => setChatDraft(null)}
              onOpenMachine={openMachine}
            />
          )}
          {route === "dashboard" && (
            <DashboardPage
              focusMachine={focusMachine}
              onFocusConsumed={() => setFocusMachine(null)}
              onAskAbout={askAbout}
            />
          )}
        </motion.main>
      </AnimatePresence>

      <Footer />
      </div>
    </MotionConfig>
  );
}
