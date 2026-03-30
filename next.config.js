/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['sharp', 'onnxruntime-node', 'pdf-parse'],
  },
  webpack: (config) => {
    // Specifically ignore onnxruntime-node completely from webpack parsing
    config.externals.push('onnxruntime-node');
    return config;
  },
}

module.exports = nextConfig
