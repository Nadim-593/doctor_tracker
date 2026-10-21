import "./globals.css";
import Providers from "@/components/providers";

export const metadata = {
  title: "CareTrack | Doctor Tracker",
  description: "Healthcare administration for care teams.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
