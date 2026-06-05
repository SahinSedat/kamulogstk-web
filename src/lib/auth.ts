import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import { verifyDjangoPassword } from "./pbkdf2";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "E-posta", type: "email" },
        password: { label: "Şifre", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.isActive) return null;

        // ADMIN, MODERATOR, CONSULTANT ve STK_MANAGER girebilir
        if (!["ADMIN", "MODERATOR", "CONSULTANT", "STK_MANAGER"].includes(user.role)) return null;

        // Dual password verification: bcrypt ($2b$) veya Django PBKDF2
        let isValid = false;
        if (user.password.startsWith("$2b$") || user.password.startsWith("$2a$")) {
          isValid = await bcrypt.compare(credentials.password, user.password);
        } else {
          isValid = verifyDjangoPassword(credentials.password, user.password);
        }
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim(),
          role: user.role,
          managedStkId: (user as any).managedStkId || null,
        };
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
        token.managedStkId = (user as any).managedStkId || null;
      }
      // STK_MANAGER ise her token yenilemede managedStkId'yi DB'den güncelle
      if (token.role === "STK_MANAGER" && token.id) {
        try {
          const { prisma: db } = await import("@/lib/prisma");
          // Önce STKOrganization.managerId ile bul
          const byManager = await db.sTKOrganization.findFirst({
            where: { managerId: token.id as string },
            select: { id: true },
          });
          if (byManager) {
            token.managedStkId = byManager.id;
          } else {
            // User.managedStkId ile bul
            const u = await db.user.findUnique({
              where: { id: token.id as string },
              select: { managedStkId: true },
            });
            token.managedStkId = u?.managedStkId || null;
          }
        } catch {}
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role as string;
        (session.user as any).id = token.id as string;
        (session.user as any).managedStkId = token.managedStkId || null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
