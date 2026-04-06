import { PrismaAdapter } from "@auth/prisma-adapter";
import { type NextAuthOptions, getServerSession } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import nodemailer from "nodemailer";

import { prisma } from "@/lib/db";

type SendEmailParams = {
  identifier: string;
  url: string;
  provider: {
    from?: string;
    server: nodemailer.TransportOptions;
  };
};

async function sendVerificationRequest({
  identifier,
  url,
  provider,
}: SendEmailParams) {
  if (!process.env.EMAIL_SERVER_HOST) {
    console.info(`[auth] Magic link for ${identifier}: ${url}`);
    return;
  }

  const transport = nodemailer.createTransport(provider.server);

  await transport.sendMail({
    to: identifier,
    from: provider.from ?? process.env.EMAIL_FROM ?? "diagnosis@local.test",
    subject: "Your Guided Pain Discovery sign-in link",
    text: `Use this sign-in link: ${url}`,
    html: `<p>Use this sign-in link:</p><p><a href="${url}">${url}</a></p>`,
  });
}

const emailServer = process.env.EMAIL_SERVER_HOST
  ? {
      host: process.env.EMAIL_SERVER_HOST,
      port: Number(process.env.EMAIL_SERVER_PORT || 587),
      auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
      },
    }
  : {
      jsonTransport: true,
    };

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "database",
  },
  secret: process.env.NEXTAUTH_SECRET || "development-secret-for-guided-pain-discovery",
  pages: {
    signIn: "/login",
  },
  providers: [
    EmailProvider({
      from: process.env.EMAIL_FROM || "diagnosis@local.test",
      maxAge: 24 * 60 * 60,
      server: emailServer,
      sendVerificationRequest,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }

      return session;
    },
  },
  events: {
    async signIn({ user }) {
      if (user.id) {
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });
      }
    },
  },
};

export function getAuthSession() {
  return getServerSession(authOptions);
}
