import { useEffect, useRef, type ReactNode } from 'react';
import { AnimatePresence, motion, useDragControls, useReducedMotion } from 'motion/react';
import { X } from 'lucide-react';

interface FilterSheetProps {
  open: boolean;
  title: string;
  resultCount: number;
  activeCount: number;
  onClose: () => void;
  onClearAll: () => void;
  children: ReactNode;
}

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), select, a[href], [tabindex]:not([tabindex="-1"])';

/**
 * Mobile bottom sheet for filters. Closes with the X button, the backdrop,
 * the Escape key or by dragging the handle down. Focus stays inside while open.
 */
export function FilterSheet({ open, title, resultCount, activeCount, onClose, onClearAll, children }: FilterSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const dragControls = useDragControls();
  // Keep the latest onClose without re-running the open/close effect on every render.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    sheetRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !sheetRef.current) return;
      const items = Array.from(sheetRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null,
      );
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label={title}>
          <motion.div
            className="absolute inset-0 bg-[#1B1E1B]/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            onClick={onClose}
          />
          <motion.div
            ref={sheetRef}
            className="absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-2xl bg-[#FAF9F5] shadow-[0_-12px_40px_rgba(27,30,27,0.18)]"
            initial={reduceMotion ? { opacity: 0 } : { y: '100%' }}
            animate={reduceMotion ? { opacity: 1 } : { y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { y: '100%' }}
            transition={{ type: 'tween', duration: reduceMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
            drag={reduceMotion ? false : 'y'}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            dragListener={false}
            dragControls={dragControls}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) onClose();
            }}
          >
            <SheetHeader
              title={title}
              activeCount={activeCount}
              onClose={onClose}
              onClearAll={onClearAll}
              onDragStart={(e) => dragControls.start(e)}
            />
            <div className="flex-1 overflow-y-auto overscroll-contain px-5">{children}</div>
            <div className="border-t border-[#1B1E1B]/10 bg-[#FAF9F5] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={onClose}
                className="h-12 w-full rounded-full bg-[#1B1E1B] text-sm font-semibold text-white hover:bg-[#2c302c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37B5C] focus-visible:ring-offset-2 cursor-pointer"
              >
                {resultCount === 0 ? 'No results, adjust filters' : `Show ${resultCount} ${resultCount === 1 ? 'result' : 'results'}`}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function SheetHeader({
  title,
  activeCount,
  onClose,
  onClearAll,
  onDragStart,
}: {
  title: string;
  activeCount: number;
  onClose: () => void;
  onClearAll: () => void;
  onDragStart: (e: React.PointerEvent) => void;
}) {
  return (
    <div className="shrink-0 touch-none border-b border-[#1B1E1B]/10 px-5 pb-3 pt-2" onPointerDown={onDragStart}>
      <div aria-hidden="true" className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-[#1B1E1B]/20" />
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-semibold text-[#1B1E1B]">{title}</h2>
        <div className="flex items-center gap-1">
          {activeCount > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="min-h-11 px-3 text-sm font-medium text-[#1B1E1B] underline decoration-[#A37B5C] decoration-2 underline-offset-4 cursor-pointer"
            >
              Clear all
            </button>
          )}
          <button
            type="button"
            data-autofocus
            onClick={onClose}
            aria-label="Close filters"
            className="flex h-11 w-11 items-center justify-center rounded-full text-[#1B1E1B] hover:bg-[#1B1E1B]/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37B5C] cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
