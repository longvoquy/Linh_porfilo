import type { ReactElement } from "react";
import type { SectionKey } from "@/lib/types";

type IconProps = { className?: string };

/** 24×24 stroke icon; colour comes from `currentColor`. */
function Icon({ className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      {children}
    </svg>
  );
}

export const sectionIcons: Record<SectionKey, (props: IconProps) => ReactElement> = {
  awards: (p) => (
    <Icon {...p}>
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3" />
    </Icon>
  ),
  leadership: (p) => (
    <Icon {...p}>
      <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M3 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1 M16 5.2a3 3 0 0 1 0 5.6 M18 14.3a5 5 0 0 1 3 4.7v1" />
    </Icon>
  ),
  "passion-projects": (p) => (
    <Icon {...p}>
      <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3Z" />
    </Icon>
  ),
  "art-portfolio": (p) => (
    <Icon {...p}>
      <path d="M12 3a9 9 0 0 0 0 18c1.1 0 1.8-.9 1.5-1.9-.3-1 .4-2.1 1.5-2.1H17a4 4 0 0 0 4-4c0-5-4-10-9-10Z" />
      <circle cx="7.5" cy="11" r="1" />
      <circle cx="10" cy="7" r="1" />
      <circle cx="15" cy="7.5" r="1" />
    </Icon>
  ),
  volunteer: (p) => (
    <Icon {...p}>
      <path d="M12 14s-4-2.6-4-5.5A2.5 2.5 0 0 1 12 7a2.5 2.5 0 0 1 4 1.5C16 11.4 12 14 12 14Z" />
      <path d="M3 17h4l4 3h6l4-4" />
    </Icon>
  ),
  research: (p) => (
    <Icon {...p}>
      <path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z M21 21l-4.5-4.5" />
    </Icon>
  ),
  internship: (p) => (
    <Icon {...p}>
      <path d="M4 8h16v11H4Z M9 8V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2 M4 13h16" />
    </Icon>
  ),
};
