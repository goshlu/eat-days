'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogIn, LogOut, User } from 'lucide-react';

export function UserNav() {
  const { data: session, status } = useSession();

  // 加载中
  if (status === 'loading') {
    return (
      <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
        <User className="h-4 w-4 animate-pulse" />
      </Button>
    );
  }

  // 未登录
  if (!session) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => signIn()}
        className="h-8 text-xs bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
      >
        <LogIn className="h-3.5 w-3.5 mr-1.5" />
        登录
      </Button>
    );
  }

  // 已登录
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={session.user?.image || ''}
              alt={session.user?.name || ''}
            />
            <AvatarFallback className="text-xs bg-white/20 text-white">
              {session.user?.name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {session.user?.name || '用户'}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {session.user?.email || ''}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut()}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>退出登录</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}