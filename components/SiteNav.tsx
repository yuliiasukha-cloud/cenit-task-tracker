import type { Session } from "next-auth";

import { SiteNavClient } from "@/components/SiteNavClient";

export function SiteNav({ session }: { session: Session | null }) {
  return <SiteNavClient session={session} />;
}
