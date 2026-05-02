import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Join Cénit",
  description: "Choose the membership that fits your rhythm.",
};

const TIERS = [
  {
    name: "Free",
    price: null as string | null,
    tagline: "Start your protocol",
    features: ["Basic task tracking", "Daily plan", "30 tasks / month"],
    popular: false,
    highlight: false,
  },
  {
    name: "Pro",
    price: "€9/month",
    tagline: "Live at your peak",
    features: [
      "Unlimited tasks",
      "AI recommendations",
      "Weekly schedule",
      "Google Calendar sync",
    ],
    popular: true,
    highlight: true,
  },
  {
    name: "Team",
    price: "€29/month",
    tagline: "Build together",
    features: ["Everything in Pro", "Shared protocols", "Team habits"],
    popular: false,
    highlight: false,
  },
] as const;

export default function JoinPage() {
  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 pb-20 pt-10 sm:px-6 sm:pt-14">
      <h1 className="text-center font-[family-name:var(--font-cormorant)] text-[clamp(2rem,4.5vw,2.75rem)] font-light italic text-[#2F4156]">
        Join Cénit
      </h1>
      <p
        className="mx-auto mt-3 max-w-lg text-center text-[14px] font-normal text-[#567C8D]"
        style={{ fontWeight: 400 }}
      >
        Pick a tier and start shaping your days with intention.
      </p>

      <div className="mx-auto mt-12 grid max-w-5xl gap-6 lg:grid-cols-3 lg:gap-5">
        {TIERS.map((tier) => (
          <Card
            key={tier.name}
            className={
              tier.highlight
                ? "relative border-[#567C8D] bg-[#F5EFEB]/50 shadow-[0_2px_24px_rgba(47,65,86,0.06)] ring-1 ring-[#567C8D]/25"
                : "border-[#EEF3F7] bg-white shadow-sm"
            }
          >
            {tier.popular ? (
              <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2">
                <Badge className="border-0 bg-[#3A8D84] px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white hover:bg-[#3A8D84]">
                  Most popular
                </Badge>
              </div>
            ) : null}
            <CardHeader
              className={
                tier.popular
                  ? "space-y-0 px-6 pb-2 pt-8 text-center sm:px-7"
                  : "space-y-0 px-6 pb-2 pt-6 text-center sm:px-7"
              }
            >
              <h2 className="font-[family-name:var(--font-cormorant)] text-[1.65rem] font-normal italic text-[#2F4156]">
                {tier.name}
              </h2>
              {tier.price ? (
                <p className="mt-2 text-[15px] font-medium text-[#567C8D]" style={{ fontWeight: 500 }}>
                  {tier.price}
                </p>
              ) : null}
              <p className="mt-1 text-[14px] font-normal italic text-[#567C8D]" style={{ fontWeight: 400 }}>
                {tier.tagline}
              </p>
            </CardHeader>
            <CardContent className="px-6 pb-2 pt-0 sm:px-7">
              <ul className="space-y-2.5 text-[13px] font-normal leading-relaxed text-[#2F4156]" style={{ fontWeight: 400 }}>
                {tier.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-[#567C8D]" aria-hidden>
                      ·
                    </span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter className="flex flex-col px-6 pb-6 pt-4 sm:px-7">
              <Button
                className="w-full rounded-lg bg-[#2F4156] text-white hover:bg-[#2F4156]/90"
                style={{ fontWeight: 500 }}
              >
                {tier.name === "Free" ? "Start free" : `Choose ${tier.name}`}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </main>
  );
}
