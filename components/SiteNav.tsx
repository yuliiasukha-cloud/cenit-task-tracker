import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";

/** Official brand lockup: `public/cenit-logo.png` (star, mountain, CÉNIT wordmark). */
export function SiteNav() {
  return (
    <nav className="sticky top-0 z-50 border-b-[0.5px] border-[#EEF3F7] bg-white font-[family-name:var(--font-dm-sans)]">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-4 py-1 sm:gap-5 sm:px-6 sm:py-1.5">
        <Link
          href="/"
          className="relative block min-w-0 max-w-[min(100%,340px)] shrink transition hover:opacity-90 sm:max-w-[min(100%,400px)]"
        >
          <Image
            src="/cenit-logo.png"
            alt="Cénit"
            width={1024}
            height={682}
            className="h-[3.675rem] w-auto object-contain object-left sm:h-[4.25rem] md:h-[4.125rem] lg:h-[4.25rem]"
            priority
            sizes="(max-width: 640px) 220px, (max-width: 1024px) 260px, 300px"
          />
        </Link>
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-x-4 gap-y-2 sm:gap-x-6">
          <Link
            href="/protocol"
            className="text-[14px] font-normal leading-normal tracking-normal text-[#567C8D] transition hover:text-[#2F4156]"
          >
            The Protocol
          </Link>
          <Link
            href="/join"
            className="text-[14px] font-normal leading-normal tracking-normal text-[#567C8D] transition hover:text-[#2F4156]"
          >
            Join Cénit
          </Link>
          <Button
            asChild
            className="h-auto shrink-0 rounded-[8px] bg-[#2F4156] px-4 py-2 text-[14px] font-medium text-white shadow-none hover:bg-[#2F4156]/95"
          >
            <Link href="/">Get started</Link>
          </Button>
        </div>
      </div>
    </nav>
  );
}
