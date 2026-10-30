"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";
import { TourBookScene, TourCctvScene, TourGpsScene } from "@/components/onboarding/TourScenes";
import { isLastStep, stepNumberLabel, TOUR_STEPS } from "@/lib/onboarding";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PAD = 6;

function useFocusTrap(active, rootRef) {
  useEffect(() => {
    if (!active) return undefined;
    const root = rootRef.current;
    if (!root) return undefined;

    const focusable = () =>
      Array.from(
        root.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );

    const nodes = focusable();
    (nodes[0] ?? root).focus();

    function onKeyDown(event) {
      if (event.key !== "Tab") return;
      const items = focusable();
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    root.addEventListener("keydown", onKeyDown);
    return () => root.removeEventListener("keydown", onKeyDown);
  }, [active, rootRef]);
}

function TourDots({ index, total, tone = "dark" }) {
  return (
    <div className="flex items-center justify-center gap-1.5" aria-hidden>
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "size-2 rounded-full",
            i === index
              ? "bg-primary"
              : tone === "light"
                ? "bg-line-strong"
                : "bg-white/25",
          )}
        />
      ))}
    </div>
  );
}

function WelcomeBody({ step, onStart, onSkip, tone, titleId, descId }) {
  return (
    <>
      <div className="flex h-36 items-center justify-center rounded-card bg-primary-50">
        <p className="text-label text-primary-600">🐾 Welcome!</p>
      </div>
      <h2 id={titleId} className="mt-5 text-h3 text-ink-900">
        {step.title}
      </h2>
      <p id={descId} className="mt-2 text-body-2 text-ink-600">
        {step.body}
      </p>
      <div className="mt-5">
        <TourDots index={0} total={TOUR_STEPS.length} tone={tone} />
      </div>
      <Button className="mt-5 w-full" onClick={onStart}>
        Start tour
      </Button>
      <button
        type="button"
        className="mt-3 w-full cursor-pointer text-center text-caption font-semibold text-ink-400 hover:text-ink-600"
        onClick={onSkip}
      >
        Skip for now
      </button>
    </>
  );
}

function WelcomeModal({ step, onStart, onSkip, isMobile }) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const descId = useId();
  useFocusTrap(true, dialogRef);

  return (
    <div className="fixed inset-0 z-[80] bg-ink-900/55">
      {isMobile ? (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descId}
          tabIndex={-1}
          className="absolute inset-x-0 bottom-0 rounded-t-[24px] bg-surface px-5 pb-8 pt-3 shadow-float outline-none"
        >
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line-strong" aria-hidden />
          <WelcomeBody
            step={step}
            onStart={onStart}
            onSkip={onSkip}
            tone="light"
            titleId={titleId}
            descId={descId}
          />
        </div>
      ) : (
        <div className="flex h-full items-center justify-center p-5">
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
            tabIndex={-1}
            className="w-full max-w-[420px] rounded-[24px] bg-surface p-6 text-left shadow-float outline-none"
          >
            <WelcomeBody
              step={step}
              onStart={onStart}
              onSkip={onSkip}
              tone="light"
              titleId={titleId}
              descId={descId}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function CoachmarkCard({ step, stepIndex, placement, arrow, onNext, onSkip, dialogRef }) {
  const titleId = useId();
  const descId = useId();
  const last = isLastStep(stepIndex);
  const sheet = placement === "sheet";

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
      tabIndex={-1}
      className={cn(
        "relative outline-none",
        sheet
          ? "rounded-t-[24px] bg-surface px-5 pb-7 pt-3 text-ink-900"
          : "w-[min(100%,22rem)] rounded-[20px] bg-ink-900 p-5 text-white shadow-float",
      )}
    >
      {sheet ? (
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line-strong" aria-hidden />
      ) : (
        <span
          aria-hidden
          className={cn(
            "absolute left-1/2 -translate-x-1/2 border-8 border-transparent",
            arrow === "top"
              ? "-top-3 border-b-ink-900 border-t-0"
              : "-bottom-3 border-t-ink-900 border-b-0",
          )}
        />
      )}
      <p className={cn("text-caption", sheet ? "font-bold text-primary" : "text-white/60")}>
        {stepNumberLabel(stepIndex)}
      </p>
      <h2 id={titleId} className={cn("mt-1", sheet ? "text-h3 text-ink-900" : "text-h4 text-white")}>
        {step.title}
      </h2>
      <p id={descId} className={cn("mt-1 text-body-2", sheet ? "text-ink-600" : "text-white/80")}>
        {step.body}
      </p>
      <div className="mt-5 flex items-center justify-between gap-3">
        <TourDots index={stepIndex} total={TOUR_STEPS.length} tone={sheet ? "light" : "dark"} />
        <div className="flex items-center gap-3">
          <button
            type="button"
            className={cn(
              "cursor-pointer text-label",
              sheet ? "text-ink-400 hover:text-ink-600" : "text-white/80 hover:text-white",
            )}
            onClick={onSkip}
          >
            Skip
          </button>
          <Button className="h-10 min-w-20 px-5" onClick={onNext}>
            {last ? "Done" : "Next"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SceneLayer({ scene }) {
  if (!scene) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[81] flex items-center justify-center px-5 md:justify-start md:px-20">
      {scene === "book" ? <TourBookScene /> : null}
      {scene === "cctv" ? <TourCctvScene /> : null}
      {scene === "gps" ? <TourGpsScene /> : null}
    </div>
  );
}

export default function OnboardingTour() {
  const { open, step, stepIndex, next, skip } = useOnboarding();
  const dialogRef = useRef(null);
  const [rect, setRect] = useState(null);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const isMobile = useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(max-width: 767px)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia("(max-width: 767px)").matches,
    () => false,
  );

  useFocusTrap(open, dialogRef);

  useEffect(() => {
    if (!open) return undefined;

    function onKey(event) {
      if (event.key === "Escape") skip();
    }
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, skip]);

  useEffect(() => {
    if (!open || !step) return undefined;

    let cancelled = false;
    let attempts = 0;

    function measure() {
      if (cancelled) return;
      if (step.kind !== "coachmark") return;
      const el = document.querySelector(`[data-tour="${step.anchor}"]`);
      if (el) {
        setRect(el.getBoundingClientRect());
        if (!step.scene) {
          el.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
        }
        return;
      }
      setRect(null);
      if (attempts < 12) {
        attempts += 1;
        window.setTimeout(measure, 120);
      }
    }

    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, step]);

  if (!mounted || !open || !step) return null;

  const overlay = (() => {
    if (step.kind === "modal") {
      return (
        <WelcomeModal step={step} onStart={next} onSkip={skip} isMobile={isMobile} />
      );
    }

    const highlight = rect
      ? {
          top: Math.max(4, rect.top - PAD),
          left: Math.max(4, rect.left - PAD),
          width: rect.width + PAD * 2,
          height: rect.height + PAD * 2,
        }
      : null;

    const arrow = step.arrow === "bottom" ? "bottom" : "top";

    const tooltipStyle = (() => {
      if (isMobile) {
        return { position: "fixed", left: 0, right: 0, bottom: 0 };
      }
      if (!highlight) {
        return {
          position: "fixed",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
        };
      }
      const placeBelow = arrow === "top";
      const top = placeBelow
        ? highlight.top + highlight.height + 18
        : Math.max(16, highlight.top - 18);
      const anchorX =
        highlight.width > 420
          ? highlight.left + 176
          : highlight.left + highlight.width / 2;
      const left = Math.min(window.innerWidth - 24, Math.max(24, anchorX));
      return {
        position: "fixed",
        top,
        left,
        transform: placeBelow ? "translate(-50%, 0)" : "translate(-50%, -100%)",
      };
    })();

    return (
      <div className="fixed inset-0 z-[80]">
        <button
          type="button"
          className="absolute inset-0 cursor-default"
          aria-label="Skip tour"
          onClick={skip}
        />
        {highlight ? null : (
          <div className="pointer-events-none absolute inset-0 bg-ink-900/55" />
        )}
        <SceneLayer scene={step.scene} />
        {highlight ? (
          <div
            className="pointer-events-none absolute rounded-card bg-transparent ring-2 ring-primary ring-offset-0"
            style={{
              top: highlight.top,
              left: highlight.left,
              width: highlight.width,
              height: highlight.height,
              boxShadow: "0 0 0 9999px rgba(43, 33, 24, 0.55)",
            }}
          />
        ) : null}
        <div style={tooltipStyle} className="z-[82]">
          <CoachmarkCard
            step={step}
            stepIndex={stepIndex}
            placement={isMobile ? "sheet" : "float"}
            arrow={arrow}
            onNext={next}
            onSkip={skip}
            dialogRef={dialogRef}
          />
        </div>
      </div>
    );
  })();

  return createPortal(overlay, document.body);
}
