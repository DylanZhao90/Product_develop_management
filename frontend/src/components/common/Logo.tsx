/**
 * An Energy PDM — Professional SVG Logo
 *
 * Combines:
 * - A stylized energy ring (EV charging + lifecycle cycle)
 * - Geometric "P" letterform integrated with the bolt
 * - Clean, scalable, theme-responsive design
 *
 * When variant="sidebar", reads brandLogoSrc from localStorage (pdm_system_settings)
 * and if a custom logo (base64 data URL) is set, renders it as an <img> instead of SVG.
 */
import { useMemo, useState, useEffect } from "react";

interface LogoProps {
  /** Size of the icon portion in px (default: 32) */
  iconSize?: number;
  /** Whether to show the brand name text (default: true) */
  showText?: boolean;
  /** Forces a specific text color (otherwise uses theme CSS variable) */
  textColor?: string;
  /** Render variant: 'sidebar' (default) uses CSS variables, 'login' uses explicit colors */
  variant?: "sidebar" | "login";
}

const STORAGE_KEY = "pdm_system_settings";

function loadBrandSettings(): { src: string; name: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const settings = JSON.parse(raw);
      return {
        src: settings.brandLogoSrc || "",
        name: settings.brandName || "安纳瑞 PDM",
      };
    }
  } catch {
    /* ignore */
  }
  return { src: "", name: "安纳瑞 PDM" };
}

export default function Logo({
  iconSize = 32,
  showText = true,
  textColor,
  variant = "sidebar",
}: LogoProps) {
  // For sidebar variant, subscribe to localStorage brand settings for reactivity
  const [brandSettings, setBrandSettings] = useState<{ src: string; name: string }>(() =>
    variant === "sidebar" ? loadBrandSettings() : { src: "", name: "安纳瑞 PDM" }
  );

  useEffect(() => {
    if (variant !== "sidebar") return;

    const sync = () => setBrandSettings(loadBrandSettings());

    // Initial load
    sync();

    // Listen for same-tab custom event (dispatched by Admin page on save)
    window.addEventListener("brand-logo-changed", sync);
    // Also listen for cross-tab storage events
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener("brand-logo-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, [variant]);

  // If a custom brand logo is set in localStorage, render it as an <img>
  if (variant === "sidebar" && brandSettings.src) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: showText ? 10 : 0,
          whiteSpace: "nowrap",
        }}
      >
        <img
          src={brandSettings.src}
          alt="brand"
          style={{
            width: iconSize,
            height: iconSize,
            objectFit: "contain",
            flexShrink: 0,
          }}
        />
        {showText && (
          <span
            style={{
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: "-0.2px",
              color: textColor || "var(--color-bg-card, #ffffff)",
              lineHeight: 1.2,
            }}
          >
            {brandSettings.name}
          </span>
        )}
      </div>
    );
  }

  // Resolve colors based on variant
  const colors = useMemo(() => {
    if (variant === "login") {
      return {
        primary: "#4f6ef6",
        accent: "#6366f1",
        highlight: "#a78bfa",
        ring: "rgba(255,255,255,0.15)",
        ringActive: "rgba(255,255,255,0.4)",
      };
    }
    // sidebar variant — use CSS variables (will resolve at runtime)
    return {
      primary: "var(--color-primary, #4f6ef6)",
      accent: "#6366f1",
      highlight: "var(--color-primary-hover, #3b4fcf)",
      ring: "rgba(255,255,255,0.08)",
      ringActive: "rgba(255,255,255,0.25)",
    };
  }, [variant]);

  const s = iconSize; // shorthand

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: showText ? 10 : 0,
        whiteSpace: "nowrap",
      }}
    >
      {/* ── SVG Logo Mark ── */}
      <svg
        width={s}
        height={s}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        <defs>
          <linearGradient id={`logo-grad-${variant}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={colors.primary} />
            <stop offset="100%" stopColor={colors.accent} />
          </linearGradient>
          <linearGradient id={`logo-glow-${variant}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.highlight} stopOpacity="0.3" />
            <stop offset="100%" stopColor={colors.highlight} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Outer ring — energy/lifecycle cycle */}
        <circle
          cx="18"
          cy="18"
          r="15.5"
          stroke={colors.ring}
          strokeWidth="1.8"
          fill="none"
        />
        <circle
          cx="18"
          cy="18"
          r="15.5"
          stroke={`url(#logo-grad-${variant})`}
          strokeWidth="1.8"
          strokeDasharray="18 8 12 8 14 8 10 8"
          strokeLinecap="round"
          fill="none"
          opacity="0.7"
        />

        {/* Inner glow fill */}
        <circle cx="18" cy="18" r="13" fill={`url(#logo-glow-${variant})`} opacity="0.5" />

        {/* Stylized lightning bolt — EV energy */}
        <path
          d="M19.5 5.5L12 17h6l-1.5 13.5L24 16h-6l1.5-10.5z"
          fill={`url(#logo-grad-${variant})`}
          stroke={colors.ringActive}
          strokeWidth="0.5"
          opacity="0.95"
        />

        {/* Small orbital dots */}
        <circle cx="7" cy="10" r="1.2" fill={colors.ringActive} opacity="0.6" />
        <circle cx="28" cy="26" r="1" fill={colors.ringActive} opacity="0.4" />
        <circle cx="14" cy="30" r="0.8" fill={colors.ringActive} opacity="0.3" />
      </svg>

      {/* ── Brand Name ── */}
      {showText && (
        <span
          style={{
            fontSize: variant === "login" ? 22 : 16,
            fontWeight: 700,
            letterSpacing: variant === "login" ? "-0.3px" : "-0.2px",
            color: textColor || (variant === "login" ? "#ffffff" : "var(--color-bg-card, #ffffff)"),
            lineHeight: 1.2,
          }}
        >
          安纳瑞 PDM
        </span>
      )}
    </div>
  );
}
