import type { CSSProperties } from "react";

/* Stroke icons for the Work tabs (Canvas, Signatures). Same 24px grid and
   line weight as the rest of Pulse, which draws its icons as inline paths. */
export const P = {
  home: "M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1Z",
  star: "M12 3.8l2.5 5.1 5.6.8-4 3.9.9 5.6L12 16.6l-5 2.6.9-5.6-4-3.9 5.6-.8Z",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M4.5 20c.9-3.4 3.8-5.3 7.5-5.3s6.6 1.9 7.5 5.3",
  users: "M9 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z M2.8 19.5c.7-3 3.1-4.7 6.2-4.7s5.5 1.7 6.2 4.7 M16 4.8a3.3 3.3 0 0 1 0 6.4 M17.6 14.9c2 .5 3.3 2 3.7 4.6",
  template: "M4.5 4.5h15v5h-15Z M4.5 13h6.5v6.5H4.5Z M14 13h5.5 M14 16.3h5.5 M14 19.5h3.5",
  bin: "M4.5 6.5h15 M9.5 6.5V4.8h5v1.7 M6.5 6.5l.8 12.3a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4l.8-12.3 M10 10.5v6 M14 10.5v6",
  folder: "M3.5 7.2A1.7 1.7 0 0 1 5.2 5.5h4l2 2.2h7.6a1.7 1.7 0 0 1 1.7 1.7v8.4a1.7 1.7 0 0 1-1.7 1.7H5.2a1.7 1.7 0 0 1-1.7-1.7Z",
  folderPlus: "M3.5 7.2A1.7 1.7 0 0 1 5.2 5.5h4l2 2.2h7.6a1.7 1.7 0 0 1 1.7 1.7v8.4a1.7 1.7 0 0 1-1.7 1.7H5.2a1.7 1.7 0 0 1-1.7-1.7Z M12 10.8v5 M9.5 13.3h5",
  chevronRight: "M9.5 6l6 6-6 6",
  chevronDown: "M6 9.5l6 6 6-6",
  chevronLeft: "M14.5 6l-6 6 6 6",
  repeat: "M17 3.5l3 3-3 3 M4 11.5v-1a4 4 0 0 1 4-4h12 M7 20.5l-3-3 3-3 M20 12.5v1a4 4 0 0 1-4 4H4",
  video: "M15.5 10.2l4.5-2.7v9l-4.5-2.7 M4 7h11.5v10H4Z",
  flag: "M5.5 21V4.5h11l-1.6 4 1.6 4h-11",
  pin: "M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z M12 12.5a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8Z",
  pinTop: "M9 4h6l-1 5 3 3v1.5H7V12l3-3Z M12 13.5V20",
  plus: "M12 5v14 M5 12h14",
  search: "m21 21-4.3-4.3 M17 11a6 6 0 1 1-12 0 6 6 0 0 1 12 0",
  upload: "M12 15.5V4.5 M7.5 9 12 4.5 16.5 9 M5 15v3.2A1.8 1.8 0 0 0 6.8 20h10.4a1.8 1.8 0 0 0 1.8-1.8V15",
  importDoc: "M7 3.5h7l4.5 4.5v11A1.5 1.5 0 0 1 17 20.5H7A1.5 1.5 0 0 1 5.5 19V5A1.5 1.5 0 0 1 7 3.5Z M14 3.5V8h4.5 M12 17.5v-6 M9.5 14 12 11.5 14.5 14",
  page: "M7 3.5h7l4.5 4.5v11A1.5 1.5 0 0 1 17 20.5H7A1.5 1.5 0 0 1 5.5 19V5A1.5 1.5 0 0 1 7 3.5Z M14 3.5V8h4.5 M8.8 12.5h6.4 M8.8 16h4.4",
  sheet: "M5 4.5h14a.5.5 0 0 1 .5.5v14a.5.5 0 0 1-.5.5H5a.5.5 0 0 1-.5-.5V5a.5.5 0 0 1 .5-.5Z M4.5 9.5h15 M4.5 14.5h15 M9.5 4.5v15",
  tracker: "M4.5 5h4v4h-4Z M4.5 15h4v4h-4Z M11.5 7h8 M11.5 17h8 M5.6 7l1 1 1.6-1.8",
  pipeline: "M4.5 4.5h4v15h-4Z M10 4.5h4v10h-4Z M15.5 4.5h4v6.5h-4Z",
  file: "M7 3.5h7l4.5 4.5v11A1.5 1.5 0 0 1 17 20.5H7A1.5 1.5 0 0 1 5.5 19V5A1.5 1.5 0 0 1 7 3.5Z M14 3.5V8h4.5",
  image: "M5 4.5h14a.5.5 0 0 1 .5.5v14a.5.5 0 0 1-.5.5H5a.5.5 0 0 1-.5-.5V5a.5.5 0 0 1 .5-.5Z M4.8 16.5l4.4-4.4 3.3 3.3 2.2-2.2 4.8 4.8 M15.3 9.2h.01",
  more: "M6 12h.01 M12 12h.01 M18 12h.01",
  list: "M8.5 6.5h11 M8.5 12h11 M8.5 17.5h11 M4.5 6.5h.01 M4.5 12h.01 M4.5 17.5h.01",
  grid: "M4.5 4.5h6v6h-6Z M13.5 4.5h6v6h-6Z M4.5 13.5h6v6h-6Z M13.5 13.5h6v6h-6Z",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M12 7.6V12l3 1.8",
  check: "M20 6 9 17l-5-5",
  x: "M6 6l12 12 M18 6 6 18",
  back: "M19 12H5 M11 6l-6 6 6 6",
  share: "M12 15V4 M8 8l4-4 4 4 M5 13v5.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V13",
  link: "M10 14a4.2 4.2 0 0 0 6 0l3-3a4.2 4.2 0 0 0-6-6l-1 1 M14 10a4.2 4.2 0 0 0-6 0l-3 3a4.2 4.2 0 0 0 6 6l1-1",
  lock: "M6.5 11h11v9h-11Z M8.5 11V8a3.5 3.5 0 0 1 7 0v3",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M3.5 12h17 M12 3c2.4 2.5 3.6 5.5 3.6 9s-1.2 6.5-3.6 9c-2.4-2.5-3.6-5.5-3.6-9S9.6 5.5 12 3Z",
  pen: "M4 20h4l10.5-10.5a2.8 2.8 0 0 0-4-4L4 16Z M13.5 6.5l4 4",
  signDoc: "M14 3.5H7A1.5 1.5 0 0 0 5.5 5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5v-6 M18.8 4.2a1.6 1.6 0 0 1 2.3 2.3L14 13.6l-3 .8.8-3Z",
  send: "M21 3 10.5 13.5 M21 3l-6.5 18-4-7.5L3 9.5Z",
  eye: "M2.6 12S6.4 5.5 12 5.5 21.4 12 21.4 12 17.6 18.5 12 18.5 2.6 12 2.6 12Z M12 14.6a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2Z",
  download: "M12 4.5v11 M7.5 11 12 15.5 16.5 11 M5 18.5h14",
  calendar: "M8 4v3 M16 4v3 M4.5 9.5h15 M6.4 6h11.2A1.9 1.9 0 0 1 19.5 8v10a1.9 1.9 0 0 1-1.9 1.9H6.4A1.9 1.9 0 0 1 4.5 18V8A1.9 1.9 0 0 1 6.4 6Z",
  hourglass: "M6.5 3.5h11 M6.5 20.5h11 M7.5 3.5c0 4 4.5 5.5 4.5 8.5S7.5 16.5 7.5 20.5 M16.5 3.5c0 4-4.5 5.5-4.5 8.5s4.5 4.5 4.5 8.5",
  text: "M5 6.5V4.5h14v2 M12 4.5v15 M9 19.5h6",
  checkbox: "M5 4.5h14a.5.5 0 0 1 .5.5v14a.5.5 0 0 1-.5.5H5a.5.5 0 0 1-.5-.5V5a.5.5 0 0 1 .5-.5Z M8.5 12l2.5 2.5 4.5-5",
  grip: "M9 6h.01 M15 6h.01 M9 12h.01 M15 12h.01 M9 18h.01 M15 18h.01",
  heading: "M6 5v14 M18 5v14 M6 12h12",
  quote: "M7 7.5h4v4H8.5c0 2.2-.6 3.5-1.5 4.5 M13 7.5h4v4h-2.5c0 2.2-.6 3.5-1.5 4.5",
  divider: "M4 12h16",
  callout: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M12 8v4.5 M12 16h.01",
  restore: "M3.5 5.5v5h5 M4.2 14a8 8 0 1 0 .3-5.3",
  copy: "M9 9h10.5v10.5H9Z M15 9V4.5H4.5V15H9",
  edit: "M12 20h9 M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z",
  sparkle: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z",
  mail: "M4.5 6.5h15v11h-15Z M4.5 7l7.5 6 7.5-6",
  shield: "M12 3.6 19.5 6v6.1c0 4-3.1 6.9-7.5 8.3-4.4-1.4-7.5-4.3-7.5-8.3V6L12 3.6Z M9.2 12.2l2 2 3.6-3.7",
  bell: "M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 2h-15Z M10 20.5h4",
  sort: "M7 4.5v15 M4 16.5l3 3 3-3 M17 19.5v-15 M14 7.5l3-3 3 3",
  sidebar: "M4.5 5h15v14h-15Z M9.5 5v14",
  open: "M14 4.5h5.5V10 M19.5 4.5 11 13 M17 13.5v4.5a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 18V8.5A1.5 1.5 0 0 1 6 7h4.5",
};

export type IcoName = keyof typeof P;

type IcoProps = {
  /** A name from P, or a raw path. */
  d: IcoName | string;
  size?: number;
  sw?: number;
  style?: CSSProperties;
  className?: string;
};

export function Ico({ d, size = 16, sw = 1.7, style, className }: IcoProps) {
  const path = (P as Record<string, string>)[d] ?? d;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flex: "none", ...style }}
      className={className}
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}
