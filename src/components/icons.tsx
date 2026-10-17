import type { SVGProps } from "react";

const paths = {
  reports: "M6 3h9l3 3v15H6V3Zm3 6h6M9 13h6M9 17h4",
  search: "M20 20l-5-5m2-6a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z",
  inventory: "m3 7 9-4 9 4v10l-9 4-9-4V7Zm0 0 9 4 9-4m-9 4v10",
  settings:
    "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM3 12h2m14 0h2M12 3v2m0 14v2M5.6 5.6 7 7m10 10 1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4",
  arrow: "M5 12h14m-6-6 6 6-6 6",
  check: "m5 12 4 4L19 6",
  copy: "M9 9h11v12H9V9ZM5 15H3V3h12v2",
  download: "M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5",
  close: "m6 6 12 12M6 18 18 6",
  clock: "M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  plus: "M12 5v14M5 12h14",
  external: "M14 3h7v7m-1-6-9 9M10 3H3v18h18v-7",
  shield: "m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6l9-4Zm-4 10 3 3 5-6",
} as const;
export function Icon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & { name: keyof typeof paths }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={paths[name]} />
    </svg>
  );
}
