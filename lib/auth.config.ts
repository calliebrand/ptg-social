import type { NextAuthConfig } from "next-auth";

const PUBLIC_PREFIXES = ["/login", "/api/auth", "/api/cron", "/api/instagram/callback", "/api/mcp", "/robots.txt"];

export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = typeof token.id === "string" ? token.id : "";
        const role = token.role;
        session.user.role =
          role === "OWNER" || role === "ADMIN" || role === "EDITOR" || role === "VIEWER"
            ? role
            : "VIEWER";
      }
      return session;
    },
    authorized({ auth, request }) {
      const path = request.nextUrl.pathname;
      if (PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix))) return true;
      return !!auth?.user;
    },
  },
} satisfies NextAuthConfig;
