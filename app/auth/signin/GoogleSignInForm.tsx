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

function GoogleSetupChecklist() {
  return (
    <div className="mt-6 rounded-xl border border-border bg-muted/40 p-4 text-[14px] leading-relaxed text-foreground">
      <p className="font-medium text-foreground">Google sign-in is not configured on this server</p>
      <p className="mt-2 text-muted-foreground">
        This is <span className="font-medium text-foreground">Sign in with Google</span> (your Google
        account), not the Google Authenticator app.
      </p>
      <ol className="mt-4 list-decimal space-y-2 pl-5 text-muted-foreground">
        <li>
          Open{" "}
          <a
            href="https://console.cloud.google.com/apis/credentials"
            className="font-medium text-primary underline underline-offset-2"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google Cloud Console → APIs & Services → Credentials
          </a>
          .
        </li>
        <li>
          Create an <strong className="text-foreground">OAuth client ID</strong> of type{" "}
          <strong className="text-foreground">Web application</strong>.
        </li>
        <li>
          Under <strong className="text-foreground">Authorized redirect URIs</strong>, add both:
          <ul className="mt-1 list-disc space-y-1 pl-5 font-mono text-[13px] text-foreground">
            <li>http://localhost:3000/api/auth/callback/google</li>
            <li>https://YOUR-PRODUCTION-DOMAIN/api/auth/callback/google</li>
          </ul>
        </li>
        <li>
          Enable the <strong className="text-foreground">Google Calendar API</strong> in the same project if you
          use “Add to Google Calendar” on the board.
        </li>
        <li>
          Copy the client ID and secret into{" "}
          <code className="rounded bg-background px-1 py-0.5 text-[13px]">.env.local</code> (local) or your
          host&apos;s env (e.g. Vercel → Project → Settings → Environment Variables):
          <ul className="mt-2 space-y-1 font-mono text-[13px] text-foreground">
            <li>
              <code className="rounded bg-background px-1">GOOGLE_CLIENT_ID</code>
            </li>
            <li>
              <code className="rounded bg-background px-1">GOOGLE_CLIENT_SECRET</code>
            </li>
            <li>
              <code className="rounded bg-background px-1">AUTH_SECRET</code> — run{" "}
              <code className="rounded bg-background px-1">openssl rand -base64 32</code>
            </li>
            <li>
              <code className="rounded bg-background px-1">AUTH_URL</code> — e.g.{" "}
              <code className="rounded bg-background px-1">http://localhost:3000</code> locally, or your
              production URL
            </li>
          </ul>
        </li>
        <li>Restart <code className="rounded bg-background px-1 text-[13px]">npm run dev</code> or redeploy.</li>
      </ol>
    </div>
  );
}

export function GoogleSignInForm({ enabled }: { enabled: boolean }) {
  if (!enabled) {
    return <GoogleSetupChecklist />;
  }

  return (
    <form action={signInWithGoogle}>
      <SubmitButton />
    </form>
  );
}
