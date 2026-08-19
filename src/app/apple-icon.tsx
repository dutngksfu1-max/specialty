import { ICON_CONTENT_TYPE, renderAppIcon } from "@/lib/appIcon";

export const size = { width: 180, height: 180 };
export const contentType = ICON_CONTENT_TYPE;

/** iOS 홈 화면 아이콘 */
export default function AppleIcon() {
  return renderAppIcon(180);
}
