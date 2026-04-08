import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: "#000000",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontSize: 22,
            fontWeight: 900,
            color: "#ffb800",
            lineHeight: 1,
            fontFamily: "sans-serif",
          }}
        >
          $
        </span>
      </div>
    ),
    { width: 32, height: 32 }
  );
}
