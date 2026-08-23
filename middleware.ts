import { createClient, OAuthStrategy } from "@wix/sdk";
import { NextResponse, type NextRequest } from "next/server";

const WIX_CLIENT_ID =
  process.env.NEXT_PUBLIC_WIX_CLIENT_ID || "a5df1008-85ea-4479-8a49-8b0576ae9714";

export async function middleware(request: NextRequest) {
  if (!request.cookies.get("session")) {
    const response = NextResponse.next();
    const wixClient = createClient({
      auth: OAuthStrategy({ clientId: WIX_CLIENT_ID }),
    });
    const tokens = await wixClient.auth.generateVisitorTokens();
    response.cookies.set("session", JSON.stringify(tokens), {
      path: "/",
      sameSite: "lax",
    });
    return response;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
