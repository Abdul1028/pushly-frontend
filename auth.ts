import NextAuth, { type NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";

export const authConfig: NextAuthConfig = {
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
      authorization: { params: { scope: "read:user repo" } },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account }) {
      if (account?.access_token) {
        (token as any).githubAccessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).githubAccessToken = (token as any).githubAccessToken;
      return session;
    },
  },
};

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth(authConfig);


