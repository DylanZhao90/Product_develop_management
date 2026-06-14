import React from "react";

/**
 * Skip-to-content link for keyboard accessibility.
 * Renders a visually hidden link that becomes visible on focus.
 * Place as the first child inside the app wrapper.
 */
export const SkipToContent: React.FC = () => (
  <a
    href="#main-content"
    className="skip-to-content"
    aria-label="Skip to main content"
    style={{
      position: "absolute",
      top: -40,
      left: 0,
      zIndex: 9999,
      padding: "8px 16px",
      background: "var(--color-primary)",
      color: "#fff",
      fontSize: 14,
      fontWeight: 600,
      borderRadius: "0 0 8px 0",
      textDecoration: "none",
      transition: "top 0.15s ease",
      outline: "none",
    }}
    // Make it visible when focused
    onFocus={(e) => {
      e.currentTarget.style.top = "0";
    }}
    onBlur={(e) => {
      e.currentTarget.style.top = "-40px";
    }}
    onClick={(e) => {
      e.preventDefault();
      const main = document.getElementById("main-content");
      if (main) {
        main.focus();
        main.scrollIntoView({ behavior: "smooth" });
      }
    }}
  >
    Skip to main content
  </a>
);

export default SkipToContent;
