import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [{
      source: "/meeting",
      headers: [{
        key: "Permissions-Policy",
        value: 'camera=(self "https://meet.jit.si"), microphone=(self "https://meet.jit.si"), display-capture=(self "https://meet.jit.si")',
      }],
    }];
  },
};

export default nextConfig;
