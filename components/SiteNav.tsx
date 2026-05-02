import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";

/** Official brand lockup: `public/cenit-logo.png` (star, mountain, CÉNIT wordmark). */
export function SiteNav() {
  return (
    <nav className="sticky top-0 z-50 border-b-[0.5px] border-[#EEF3F7] bg-white pt-[env(safe-area-inset-top,0px)] font-[family-name:var(--font-dm-sans)]">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-2 px-3 py-1.5 handset:gap-5 handset:px-6 handset:py-1.5">
        <Link
          href="/"
          className="relative block min-w-0 max-w-[min(100%,240px)] shrink transition hover:opacity-90 handset:max-w-[min(100%,400px)]"
        >
          <Image
            src="/cenit-logo.png"
            alt="Cénit"
            width={1024}
            height={682}
            className="h-[2.85rem] w-auto object-contain object-left handset:h-[4.25rem] md:h-[4.125rem] lg:h-[4.25rem]"
            priority
            sizes="(max-width: 640px) 220px, (max-width: 1024px) 260px, 300px"
          />
        </Link>
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-x-2 gap-y-1 handset:gap-x-6 handset:gap-y-2">
          <Link
            href="/protocol"
            className="flex min-h-[44px] items-center text-[13px] font-normal leading-normal tracking-normal text-[#567C8D] transition hover:text-[#2F4156] handset:text-[14px]"
          >
            The Protocol
          </Link>
          <Link
            href="/join"
            className="flex min-h-[44px] items-center text-[13px] font-normal leading-normal tracking-normal text-[#567C8D] transition hover:text-[#2F4156] handset:text-[14px]"
          >
            Join Cénit
          </Link>
          <Button
            asChild
            className="h-auto min-h-[44px] shrink-0 rounded-[8px] bg-[#2F4156] px-3 py-2 text-[13px] font-medium text-white shadow-none hover:bg-[#2F4156]/95 handset:px-4 handset:text-[14px]"
          >
            <Link href="/" className="flex items-center">
              Get started
            </Link>
          </Button>
        </div>
      </div>
    </nav>
  );
}
