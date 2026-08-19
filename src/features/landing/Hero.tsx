import { HERO } from "@/lib/siteCopy";

/** Hero — docs/design.md 12장. 장식 없이 타이포그래피와 여백으로만 만듭니다. */
export function Hero() {
  return (
    <section className="pb-8">
      <h1 className="mx-auto max-w-[16ch] text-display text-foreground sm:text-display-lg">
        {HERO.title}
      </h1>
    </section>
  );
}
