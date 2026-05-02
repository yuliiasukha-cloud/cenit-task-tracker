import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";

import { GoogleSignInForm } from "./GoogleSignInForm";

export const metadata = {
  title: "Sign in · Cénit",
};

export default async function SignInPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/");
  }

  const googleAuthEnabled =
    Boolean(process.env.GOOGLE_CLIENT_ID?.length) && Boolean(process.env.GOOGLE_CLIENT_SECRET?.length);

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-[family-name:var(--font-cormorant)] text-3xl font-bold italic text-foreground md:text-4xl">
        Sign in
      </h1>
      <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
        Use your Google account. Your tasks stay private to your account.
      </p>
      <GoogleSignInForm enabled={googleAuthEnabled} />
      <Link
        href="/"
        className="mt-10 inline-block min-h-[44px] text-[14px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        ← Back home
      </Link>
    </div>
  );
}
