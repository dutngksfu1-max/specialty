import { ICON_CONTENT_TYPE, renderAppIcon } from "@/lib/appIcon";

export const size = { width: 64, height: 64 };
export const contentType = ICON_CONTENT_TYPE;

/** 브라우저 탭 아이콘 */
export default function Icon() {
  return renderAppIcon(64);
}
