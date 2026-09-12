import type { ReactNode } from "react";
import "./theme.css";

export default function ComingSoonLayout({ children }: { children: ReactNode }) {
  return <div className="coming-soon-soft">{children}</div>;
}
