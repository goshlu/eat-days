// ============================================================
// NextAuth.js 配置
// 支持 GitHub 和 Google 登录
// ============================================================

import { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import GitHubProvider from 'next-auth/providers/github';
import GoogleProvider from 'next-auth/providers/google';
import { prisma } from './prisma';

export const authOptions: NextAuthOptions = {
  // 使用 Prisma 适配器持久化用户/会话
  adapter: PrismaAdapter(prisma) as NextAuthOptions['adapter'],

  // 认证提供商
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],

  // Session 策略
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 天
  },

  // JWT 配置
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 天
  },

  // 自定义页面
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },

  // 回调函数
  callbacks: {
    // JWT 回调：将 userId 写入 token
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },

    // Session 回调：将 userId 暴露给客户端
    async session({ session, token }) {
      if (session.user && token.id) {
        (session.user as { id?: string }).id = token.id as string;
      }
      return session;
    },
  },

  // 密钥
  secret: process.env.NEXTAUTH_SECRET,
};