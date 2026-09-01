import { ImageResponse } from "next/og";

// Matches the navbar logo mark exactly (src/components/NavBar.tsx):
// bg-gradient-to-br from-teal-500 to-teal-700, "CP", white, bold.
// favicon.ico (generated alongside this — see gen_favicon.py in the repo
// root's history) covers older browsers that only look for that file;
// this covers everything that reads the <link rel="icon"> Next.js wires
// up automatically for this route.
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: 14,
          color: "white",
          fontSize: 30,
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
