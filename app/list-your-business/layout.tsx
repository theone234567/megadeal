import { WixProvider } from "@/context/WixProvider";

/**
 * The signup form registers and signs in through Wix, so this section has
 * Wix sign-in; the rest of the public site doesn't load it (app/layout.tsx).
 */
export default function ListYourBusinessLayout({ children }: { children: React.ReactNode }) {
  return <WixProvider>{children}</WixProvider>;
}
