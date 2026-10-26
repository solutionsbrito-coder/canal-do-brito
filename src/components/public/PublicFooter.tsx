import { useRef, useCallback, useState } from "react";
import { toast } from "sonner";
import { LoginModal } from "./LoginModal";

export const PublicFooter = () => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showLogin, setShowLogin] = useState(false);

  const startHold = useCallback(() => {
    timerRef.current = setTimeout(() => {
      toast.info("Abrindo acesso...");
      setShowLogin(true);
    }, 1500);
  }, []);

  const cancelHold = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return (
    <>
      <footer className="pb-20 pt-6">
        <p
          className="text-center text-[10px] font-body select-none cursor-default text-foreground/[0.06]"
          onMouseDown={startHold}
          onMouseUp={cancelHold}
          onMouseLeave={cancelHold}
          onTouchStart={startHold}
          onTouchEnd={cancelHold}
        >
          © {new Date().getFullYear()} Canal do Brito
        </p>
      </footer>

      <LoginModal open={showLogin} onClose={() => setShowLogin(false)} />
    </>
  );
};
