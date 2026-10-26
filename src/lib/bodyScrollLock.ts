/**
 * Reference-counted body scroll lock.
 * Multiple modals can call lock(); the body only unlocks when ALL of them call unlock().
 * Captures and restores the original `overflow` value once, on the first lock.
 */
let count = 0;
let prevOverflow = "";

export const lockBodyScroll = () => {
  if (typeof document === "undefined") return;
  if (count === 0) {
    prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  count += 1;
};

export const unlockBodyScroll = () => {
  if (typeof document === "undefined") return;
  if (count === 0) return;
  count -= 1;
  if (count === 0) {
    document.body.style.overflow = prevOverflow;
  }
};

// Test-only helper.
export const __resetBodyScrollLock = () => {
  count = 0;
  prevOverflow = "";
  if (typeof document !== "undefined") document.body.style.overflow = "";
};
