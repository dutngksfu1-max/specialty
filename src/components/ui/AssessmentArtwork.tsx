import Image from "next/image";

import type { LocalArtwork } from "@/lib/assessmentPresentation";
import { cn } from "@/lib/cn";

export function AssessmentArtwork({
  artwork,
  className,
  imageClassName,
  preload = false,
}: {
  readonly artwork: LocalArtwork;
  readonly className?: string;
  readonly imageClassName?: string;
  readonly preload?: boolean;
}) {
  return (
    <div className={cn("relative overflow-hidden rounded-(--radius-hero) bg-surface", className)}>
      <Image
        src={artwork.src}
        width={artwork.width}
        height={artwork.height}
        alt={artwork.alt}
        aria-hidden={artwork.alt === ""}
        preload={preload}
        sizes="(max-width: 767px) calc(100vw - 32px), (max-width: 1199px) 50vw, 560px"
        className={cn("h-auto w-full object-cover", imageClassName)}
      />
      <span aria-hidden="true" className="ambient-thread absolute inset-x-[12%] bottom-[9%] h-px bg-primary/30" />
    </div>
  );
}
