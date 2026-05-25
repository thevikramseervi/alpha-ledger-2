import { ImageResponse } from "next/og";
import { renderPwaIcon } from "@/lib/pwa-icon";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestedSize = Number(searchParams.get("size") ?? "512");
  const size = requestedSize === 192 ? 192 : 512;

  return new ImageResponse(renderPwaIcon(size), {
    width: size,
    height: size,
  });
}
