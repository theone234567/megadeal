import type { Metadata } from "next";
import { cookies } from "next/headers";
import { RESET_COOKIE } from "@/lib/sensitivePaths";
import ResetPasswordForm from "./ResetPasswordForm";

export const metadata: Metadata = {
  title: "Set a new password",
  robots: { index: false, follow: false },
};

// Built per visit: it reads the reset cookie (middleware.ts).
export default async function ResetPasswordPage() {
  const hasLink = (await cookies()).has(RESET_COOKIE);
  return <ResetPasswordForm hasLink={hasLink} />;
}
