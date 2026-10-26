import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { useVersionCheck } from "@/hooks/useVersionCheck";

/**
 * Shown when a new deploy is detected.
 * Floats above the bottom nav, respecting iOS safe areas.
 */
export default function UpdateAvailableBanner() {
  const { updateAvailable, applyUpdate } = useVersionCheck();

  return (
    <AnimatePresence>
      {updateAvailable && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          className="fixed left-1/2 -translate-x-1/2 z-[80] w-[92%] max-w-md"
          style={{ bottom: "calc(5.5rem + env(safe-area-inset-bottom, 0px))" }}
          role="status"
          aria-live="polite"
        >
          <button
            onClick={applyUpdate}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-[#00ff87] text-[#07080a] font-semibold shadow-lg shadow-[#00ff87]/20 active:scale-[0.98] transition-transform"
            aria-label="Atualizar para a nova versão"
          >
            <span className="text-sm">Nova versão disponível</span>
            <span className="flex items-center gap-1.5 text-sm">
              <RefreshCw size={16} strokeWidth={2.5} />
              Atualizar
            </span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
