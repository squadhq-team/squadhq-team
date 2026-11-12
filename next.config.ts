import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Alte Adressen aus P3/P4 (Lesezeichen, Präsentationen) auf die neuen Bereiche umleiten
  async redirects() {
    return [
      { source: "/spieler", destination: "/start", permanent: false },
      { source: "/trainer", destination: "/termine", permanent: false },
      { source: "/trainer/neu", destination: "/termine/neu", permanent: false },
      { source: "/trainer/training/:id", destination: "/termine/:id", permanent: false },
    ];
  },
};

export default nextConfig;
