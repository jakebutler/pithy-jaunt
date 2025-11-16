import type { NextConfig } from "next";
import NodePolyfillPlugin from "node-polyfill-webpack-plugin";
import { env, nodeless } from "unenv";

const { alias: turbopackAlias } = env(nodeless, {});

const nextConfig: NextConfig = {
  // Turbopack
  turbopack: {
    resolveAlias: {
      ...turbopackAlias,
    },
  },
  // Webpack
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.plugins.push(new NodePolyfillPlugin());
    }
    return config;
  },
};

export default nextConfig;

