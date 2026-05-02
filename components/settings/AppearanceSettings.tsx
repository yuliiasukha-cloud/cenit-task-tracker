"use client";

import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AppearanceSettings() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const active = theme ?? "system";

  return (
    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      {(
        [
          ["light", "Light"],
          ["dark", "Dark"],
          ["system", "System"],
        ] as const
      ).map(([value, label]) => (
        <Button
          key={value}
          type="button"
          variant={active === value ? "default" : "outline"}
          className={cn(
            "min-h-[44px] flex-1 text-[14px] font-medium sm:flex-none sm:min-w-[7.5rem]",
            active === value ? "" : "border-border bg-transparent",
          )}
          onClick={() => setTheme(value)}
        >
          {label}
          {value === "system" && active === "system" && resolvedTheme ? (
            <span className="ml-1 text-[12px] font-normal opacity-80">
              ({resolvedTheme === "dark" ? "dark" : "light"})
            </span>
          ) : null}
        </Button>
      ))}
    </div>
  );
}
