import { SessionProvider } from "@/context/SessionProvider";

/**
 * The signup form needs to know who's signed in, so this section has the
 * session; the rest of the public site doesn't load it (app/layout.tsx).
 */
export default function ListYourBusinessLayout({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
