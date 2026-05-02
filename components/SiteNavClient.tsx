"use client";

import Image from "next/image";
import Link from "next/link";
import type { Session } from "next-auth";

import { signOutAction } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";

type SiteNavClientProps = {
  session: Session | null;
};

export function SiteNavClient({ session }: SiteNavClientProps) {
  const signedIn = Boolean(session?.user);

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background pt-[env(safe-area-inset-top,0px)] font-[family-name:var(--font-dm-sans)]">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-2 px-3 py-1.5 md:gap-5 md:px-6 md:py-1.5">
        <Link
          href="/"
          className="relative block min-w-0 max-w-[min(100%,260px)] shrink transition hover:opacity-90 md:max-w-[min(100%,400px)]"
        >
          <Image
            src="/cenit-logo.png"
            alt="Cénit"
            width={1024}
            height={682}
            className="h-[2.75rem] w-auto object-contain object-left md:h-[4.25rem] lg:h-[4.125rem] xl:h-[4.25rem]"
            priority
            sizes="(max-width: 640px) 220px, (max-width: 1024px) 260px, 300px"
          />
        </Link>
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-x-2 gap-y-1 md:gap-x-6 md:gap-y-2">
          <Link
            href="/protocol"
            className="hidden min-h-[44px] items-center text-[14px] font-normal leading-normal tracking-normal text-muted-foreground transition hover:text-foreground md:flex"
          >
            The Protocol
          </Link>
          <Link
            href="/join"
            className="hidden min-h-[44px] items-center text-[14px] font-normal leading-normal tracking-normal text-muted-foreground transition hover:text-foreground md:flex"
          >
            Join Cénit
          </Link>
          <Button
            asChild
            variant="ghost"
            className="hidden h-auto min-h-[44px] shrink-0 px-2 text-[14px] font-normal text-muted-foreground hover:text-foreground md:inline-flex"
          >
            <Link href="/settings">Settings</Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            className="h-auto min-h-[44px] shrink-0 px-2 text-[14px] font-normal text-muted-foreground hover:text-foreground md:hidden"
          >
            <Link href="/settings" aria-label="Settings">
              <span className="sr-only">Settings</span>
              <span aria-hidden>⚙</span>
            </Link>
          </Button>
          {signedIn ? (
            <form action={signOutAction}>
              <Button
                type="submit"
                variant="outline"
                className="h-auto min-h-[44px] shrink-0 rounded-[8px] border-border px-3 py-2 text-[14px] font-medium text-foreground shadow-none md:px-4"
              >
                Sign out
              </Button>
            </form>
          ) : (
            <Button
              asChild
              variant="outline"
              className="h-auto min-h-[44px] shrink-0 rounded-[8px] border-border px-3 py-2 text-[14px] font-medium text-foreground shadow-none md:px-4"
            >
              <Link href="/auth/signin">Sign in</Link>
            </Button>
          )}
          <Button
            asChild
            className="h-auto min-h-[44px] shrink-0 rounded-[8px] bg-primary px-3 py-2 text-[14px] font-medium text-primary-foreground shadow-none hover:bg-primary/95 md:px-4"
          >
            <Link href="/">Get started</Link>
          </Button>
        </div>
      </div>
    </nav>
  );
}
