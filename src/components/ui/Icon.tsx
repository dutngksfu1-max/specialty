import type { ReactNode, SVGProps } from "react";

import { cn } from "@/lib/cn";

export type IconName =
  | "arrow-left"
  | "arrow-right"
  | "book"
  | "check"
  | "chevron-down"
  | "clock"
  | "compass"
  | "device"
  | "home"
  | "layers"
  | "lock"
  | "menu"
  | "message"
  | "pause"
  | "restart"
  | "warning";

const paths: Record<IconName, ReactNode> = {
  "arrow-left": <path d="m14.5 6-6 6 6 6M9 12h10" />,
  "arrow-right": <path d="m9.5 6 6 6-6 6M5 12h10" />,
  book: <path d="M4 5.5c2.8-1.2 5.5-.8 8 1.2v12c-2.5-2-5.2-2.4-8-1.2v-12Zm16 0c-2.8-1.2-5.5-.8-8 1.2v12c2.5-2 5.2-2.4 8-1.2v-12Z" />,
  check: <path d="m6 12.5 4 4L18.5 8" />,
  "chevron-down": <path d="m7 10 5 5 5-5" />,
  clock: <path d="M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />,
  compass: <path d="m15.5 8.5-2 5-5 2 2-5 5-2ZM21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />,
  device: <path d="M7 3.5h10a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 19V5A1.5 1.5 0 0 1 7 3.5ZM10 17.5h4" />,
  home: <path d="m4 11 8-7 8 7v8.5h-5.5v-6h-5v6H4V11Z" />,
  layers: <path d="m4 9 8-5 8 5-8 5-8-5Zm1 5 7 4 7-4" />,
  lock: <path d="M7 10V8a5 5 0 0 1 10 0v2M6 10h12v10H6V10Zm6 4v2" />,
  menu: <path d="M5 7h14M5 12h14M5 17h14" />,
  message: <path d="M5 5.5h14v10H9l-4 3v-13Z" />,
  pause: <path d="M8.5 6v12M15.5 6v12" />,
  restart: <path d="M5.5 8.5A8 8 0 1 1 5 15M5.5 8.5V4M5.5 8.5H10" />,
  warning: <path d="M12 8v5M12 16.5v.1M12 3.5 21 20H3L12 3.5Z" />,
};

export function Icon({ name, className, ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("size-5 shrink-0", className)}
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
