import { ImageResponse } from "next/og";
import { renderPwaIcon } from "@/lib/pwa-icon";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(renderPwaIcon(size.width), size);
}
