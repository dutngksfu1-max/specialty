import { renderAppIcon } from "@/lib/appIcon";

/** 안드로이드가 모양대로 잘라 내므로 안전 영역 여백을 크게 둡니다. */
export const dynamic = "force-static";

export function GET() {
  return renderAppIcon(512, true);
}
