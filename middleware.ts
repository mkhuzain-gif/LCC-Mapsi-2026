import { updateSession } from "@/lib/supabase/middleware";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt, manifest.json, manifest.webmanifest, sw.js, offline.html
     * - all static assets with common file extensions
     */
    "/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|manifest\\.json|manifest\\.webmanifest|sw\\.js|offline\\.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|js|webmanifest|html|css|woff|woff2|ttf|eot)$).*)",
  ],
};
