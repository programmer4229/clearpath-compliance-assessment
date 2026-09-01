import { ImageResponse } from "next/og";

// Same mark as icon.tsx, but no rounded corners / transparency — iOS
// applies its own rounded-corner mask on top of a solid square, so a
// pre-rounded or transparent source looks wrong on a home screen.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(to bottom right, #14b8a6, #0f766e)",
          color: "white",
          fontSize: 84,
          fontWeight: 700,
          fontFamily: "sans-serif",
        }}
      >
        CP
      </div>
    ),
    { ...size }
  );
}
