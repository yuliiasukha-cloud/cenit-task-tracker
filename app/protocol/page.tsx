import type { Metadata } from "next";
import Link from "next/link";
import { Activity, Apple, Brain, Moon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "The Protocol — Cénit",
  description: "Science-backed foundations for your daily rhythm.",
};

const SCIENCE_CARDS = [
  {
    title: "Chronobiology",
    body: "Your body runs on a 24-hour biological clock. Cortisol peaks 30 minutes after waking. Testosterone is highest in the morning. Your brain's prefrontal cortex is sharpest 1-3 hours after waking. Cénit aligns every block in your schedule to these natural windows — not to a generic 9-to-5.",
  },
  {
    title: "Longevity science",
    body: "VO2 max is the single strongest predictor of all-cause mortality — more than smoking, weight, or cholesterol. Muscle mass starts declining at 25. Sleep debt accumulates and cannot be fully recovered. Cénit builds your protocol around the interventions with the highest proven impact on how long and how well you live.",
  },
  {
    title: "Radical personalization",
    body: "A morning person and a night owl have completely different optimal schedules. A stressed executive and a student need different recovery protocols. Cénit asks 22 questions about your real life — then builds a protocol that fits it. Not a template. Yours.",
  },
] as const;

const RESEARCH_PILLARS = [
  {
    icon: Moon,
    title: "Sleep architecture",
    description:
      "4-5 full sleep cycles needed. Deep sleep repairs body. REM processes emotion and creativity.",
  },
  {
    icon: Activity,
    title: "Exercise physiology",
    description:
      "Resistance training 3x/week reverses sarcopenia. Zone 2 cardio 150 min/week for longevity.",
  },
  {
    icon: Apple,
    title: "Nutrition timing",
    description:
      "First meal 60-90 min after waking. Last meal 3-4 hours before sleep. Protein first at every meal.",
  },
  {
    icon: Brain,
    title: "Cognitive performance",
    description:
      "Ultradian 90-min focus cycles. Adenosine builds sleep pressure. Caffeine 90 min after waking.",
  },
] as const;

export default function ProtocolPage() {
  return (
    <main className="mx-auto w-full max-w-[1200px] overflow-x-hidden px-4 pb-20 pt-10 sm:px-6 sm:pt-14">
      <h1 className="mx-auto max-w-3xl text-center font-[family-name:var(--font-cormorant)] text-[clamp(2rem,5vw,3.25rem)] font-light italic leading-[1.15] tracking-tight text-[#2F4156]">
        Built on centuries of research
      </h1>
      <p className="mx-auto mt-5 max-w-2xl text-center text-[15px] font-normal leading-relaxed text-[#567C8D] sm:text-[16px] sm:leading-relaxed" style={{ fontWeight: 400 }}>
        We didn&apos;t invent the science. We just made it work for your actual life.
      </p>

      <div className="mx-auto mt-14 grid max-w-5xl gap-6 sm:grid-cols-3 sm:gap-5">
        {SCIENCE_CARDS.map((card) => (
          <Card
            key={card.title}
            className="border-0 bg-[#F5EFEB] shadow-none ring-1 ring-[#EEF3F7]/80"
          >
            <CardContent className="p-6 sm:p-7">
              <h2 className="font-[family-name:var(--font-cormorant)] text-[1.35rem] font-normal italic leading-snug text-[#2F4156]">
                {card.title}
              </h2>
              <p
                className="mt-3 text-[14px] font-normal leading-relaxed text-[#567C8D]"
                style={{ fontWeight: 400 }}
              >
                {card.body}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-16 flex justify-center">
        <Button
          asChild
          className="h-auto rounded-lg bg-[#2F4156] px-8 py-3 text-[15px] font-medium text-white shadow-none hover:bg-[#2F4156]/90"
          style={{ fontWeight: 500 }}
        >
          <Link href="/">Create your perfect day</Link>
        </Button>
      </div>

      <section className="mt-24 border-t border-[#EEF3F7] pt-20">
        <h2 className="mx-auto max-w-3xl text-center font-[family-name:var(--font-cormorant)] text-[clamp(1.65rem,4vw,2.25rem)] font-normal italic leading-snug text-[#2F4156]">
          The research behind Cénit
        </h2>

        <div className="mx-auto mt-12 grid max-w-4xl gap-6 sm:grid-cols-2 sm:gap-5">
          {RESEARCH_PILLARS.map(({ icon: Icon, title, description }) => (
            <Card
              key={title}
              className="border-0 bg-[#F5EFEB] shadow-none ring-1 ring-[#EEF3F7]/80"
            >
              <CardContent className="flex flex-col gap-3 p-6 sm:p-7">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/80 ring-1 ring-[#EEF3F7]">
                  <Icon className="h-5 w-5 text-[#567C8D]" strokeWidth={1.5} aria-hidden />
                </div>
                <h3 className="font-[family-name:var(--font-cormorant)] text-[1.25rem] font-normal italic leading-snug text-[#2F4156]">
                  {title}
                </h3>
                <p className="text-[14px] font-normal leading-relaxed text-[#567C8D]" style={{ fontWeight: 400 }}>
                  {description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <blockquote className="mx-auto mt-24 max-w-3xl border-y border-[#EEF3F7] py-14 text-center sm:py-16">
        <p className="font-[family-name:var(--font-cormorant)] text-[clamp(1.5rem,4.2vw,2.25rem)] font-normal italic leading-[1.45] text-[#2F4156]">
          &ldquo;The best time to optimize your life was 10 years ago. The second best time is today.&rdquo;
        </p>
        <footer className="mt-6 text-[13px] font-normal tracking-wide text-[#567C8D]" style={{ fontWeight: 400 }}>
          — Cénit Protocol
        </footer>
      </blockquote>

      <section className="mt-20 bg-[#2F4156] px-4 py-16 text-center sm:px-8 sm:py-20">
        <h2 className="font-[family-name:var(--font-cormorant)] text-[clamp(1.75rem,4.5vw,2.5rem)] font-normal italic leading-tight text-white">
          Ready to build your protocol?
        </h2>
        <p className="mx-auto mt-4 max-w-md text-[14px] font-normal leading-relaxed text-white/85" style={{ fontWeight: 400 }}>
          Join thousands living at their peak.
        </p>
        <div className="mt-8 flex justify-center">
          <Button
            asChild
            variant="outline"
            className="h-auto rounded-lg border-white bg-transparent px-8 py-3 text-[15px] font-medium text-white shadow-none hover:bg-white/10 hover:text-white"
            style={{ fontWeight: 500 }}
          >
            <Link href="/">Get started</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
