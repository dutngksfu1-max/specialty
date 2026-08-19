import { Accordion } from "@/components/ui/Accordion";
import { FAQ } from "@/lib/siteCopy";

/** 이용 안내 / FAQ (PRD F-1.1, DEC-027 초안) */
export function FaqAccordion() {
  return (
    <section className="py-12">
      <h2 className="text-h2 text-foreground sm:text-h2-lg">이용 안내</h2>

      <div className="mt-6 border-t border-border">
        {FAQ.map((item) => (
          <Accordion key={item.question} summary={item.question}>
            <p className="max-w-prose">{item.answer}</p>
          </Accordion>
        ))}
      </div>
    </section>
  );
}
