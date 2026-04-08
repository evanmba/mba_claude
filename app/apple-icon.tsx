import { ImageResponse } from "next/og";

export const size        = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: "#000000",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          width="110"
          height="120"
          viewBox="0 0 110 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Funnel wide mouth */}
          <polygon
            points="4,8 106,8 68,58 42,58"
            fill="#ffb800"
          />
          {/* Funnel stem */}
          <rect x="42" y="58" width="26" height="54" rx="5" fill="#ffb800" />
          {/* Top lip / rim */}
          <rect x="4" y="4" width="102" height="10" rx="4" fill="#ffb800" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
