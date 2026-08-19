import { renderAppIcon } from "@/lib/appIcon";

/** PWA manifest용 아이콘 (설치 요건: 192 / 512 필수) */
export const dynamic = "force-static";

export function GET() {
  return renderAppIcon(192);
}
