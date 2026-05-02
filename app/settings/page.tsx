import Link from "next/link";
import type { Metadata } from "next";

import { auth } from "@/auth";
import { AppearanceSettings } from "@/components/settings/AppearanceSettings";

export const metadata: Metadata = {
  title: "Settings · Cénit",
};

export default async function SettingsPage() {
  const session = await auth();

  return (
    <div className="mx-auto max-w-lg px-4 py-10 md:py-14">
      <Link
        href="/"
        className="inline-flex min-h-[44px] items-center text-[14px] text-muted-foreground transition hover:text-foreground"
      >
        ← Home
      </Link>
      <h1 className="mt-4 font-[family-name:var(--font-cormorant)] text-3xl font-bold italic text-foreground md:text-4xl">
        Settings
      </h1>
      <p className="mt-2 text-[14px] text-muted-foreground">Account and how Cénit looks on this device.</p>

      <section className="mt-10 rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-medium text-card-foreground">Appearance</h2>
        <p className="mt-1 text-[14px] text-muted-foreground">Light, dark, or match your device.</p>
        <AppearanceSettings />
      </section>

      {session?.user ? (
        <p className="mt-10 text-[14px] text-muted-foreground">
          Signed in as{" "}
          <span className="font-medium text-foreground">{session.user.email ?? session.user.name}</span>
        </p>
      ) : (
        <p className="mt-10 text-[14px] text-muted-foreground">
          Sign in to keep tasks synced to your account. Theme is stored on this browser until you change it.
        </p>
      )}
    </div>
  );
}
