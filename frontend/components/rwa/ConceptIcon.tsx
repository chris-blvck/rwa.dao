// Minimal monochrome line icons that hint at each preset's video type.
export function ConceptIcon({ type, className = "h-10 w-10" }: { type: string; className?: string }) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (type) {
    case "unboxing":
      return (
        <svg {...common}>
          <path d="M3 8l9-4 9 4-9 4-9-4z" />
          <path d="M3 8v8l9 4 9-4V8" />
          <path d="M12 12v8" />
        </svg>
      );
    case "watch_presentation":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="5.5" />
          <path d="M12 9.5V12l1.8 1.2M9 2.5h6M9 21.5h6" />
        </svg>
      );
    case "luxury_reveal":
      return (
        <svg {...common}>
          <path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6z" />
        </svg>
      );
    case "qr_explainer":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <path d="M14 14h3v3M21 14v7M17 21h-3" />
        </svg>
      );
    case "ambassador_pitch":
      return (
        <svg {...common}>
          <path d="M3 10v4l11 5V5L3 10z" />
          <path d="M14 8a4 4 0 010 8M7 14v3a2 2 0 002 2" />
        </svg>
      );
    case "community_angle":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3" />
          <path d="M3 20a6 6 0 0112 0" />
          <path d="M16 6.5a3 3 0 010 5.5M21 20a6 6 0 00-5-5.9" />
        </svg>
      );
    case "risk_first_explainer":
      return (
        <svg {...common}>
          <path d="M12 3l8 3v6c0 4.5-3.2 7.4-8 9-4.8-1.6-8-4.5-8-9V6l8-3z" />
          <path d="M12 9v4M12 16h.01" />
        </svg>
      );
    case "product_showcase":
      return (
        <svg {...common}>
          <path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6z" opacity="0.9" />
          <circle cx="18" cy="6" r="1.5" />
        </svg>
      );
    case "unboxing_asmr":
      return (
        <svg {...common}>
          <path d="M4 12a3 3 0 016 0M2 12a5 5 0 0110 0M9 5l9-2v16M18 8a3 3 0 010 6" />
        </svg>
      );
    case "selfie_testimonial":
      return (
        <svg {...common}>
          <rect x="6" y="2" width="12" height="20" rx="2" />
          <circle cx="12" cy="9" r="2.5" />
          <path d="M8 16a4 4 0 018 0" />
        </svg>
      );
    case "worn_wrist":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4" />
          <path d="M9.2 8.4L9.5 4h5l.3 4.4M9.2 15.6l.3 4.4h5l.3-4.4" />
        </svg>
      );
    case "direct_to_camera":
      return (
        <svg {...common}>
          <rect x="2" y="6" width="14" height="12" rx="2" />
          <path d="M16 10l6-3v10l-6-3z" />
        </svg>
      );
    case "before_after":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M12 4v16" />
          <path d="M6 12h3M15 12h3" />
        </svg>
      );
    case "tutorial":
      return (
        <svg {...common}>
          <path d="M4 6h10M4 12h10M4 18h7" />
          <path d="M18 7l2 2-5 5-3 1 1-3 5-5z" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M10 9l5 3-5 3V9z" />
        </svg>
      );
  }
}
