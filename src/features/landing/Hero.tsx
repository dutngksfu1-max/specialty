import { HERO } from "@/lib/siteCopy";

/** Hero — docs/design.md 12장. 장식 없이 타이포그래피와 여백으로만 만듭니다. */
export function Hero() {
  return (
    <section className="py-16 sm:py-24">
      <h1 className="max-w-[16ch] text-display text-foreground sm:text-display-lg">
        {HERO.title}
      </h1>
      <p className="mt-5 max-w-prose text-body-lg text-foreground-muted sm:text-body-lg-desktop">
        {HERO.subtitle}
      </p>
    </section>
  );
}
