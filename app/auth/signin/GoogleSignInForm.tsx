"use client";

import { useFormStatus } from "react-dom";

import { signInWithGoogle } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="mt-6 min-h-[44px] w-full text-[14px] font-medium">
      {pending ? "Redirecting…" : "Continue with Google"}
    </Button>
  );
}

export function GoogleSignInForm({ enabled }: { enabled: boolean }) {
  if (!enabled) {
    return (
      <p className="mt-6 text-[14px] leading-relaxed text-destructive">
        Google sign-in is not configured yet. Add{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-[13px]">GOOGLE_CLIENT_ID</code> and{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-[13px]">GOOGLE_CLIENT_SECRET</code> to your
        environment, then redeploy.
      </p>
    );
  }

  return (
    <form action={signInWithGoogle}>
      <SubmitButton />
    </form>
  );
}
