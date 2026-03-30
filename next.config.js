/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: [
      'sharp',
      'onnxruntime-node',
      'pdf-parse',
      'pdfjs-dist',
      '@napi-rs/canvas',
      'tesseract.js',
    ],
  },
  webpack: (config) => {
    // Externalize native/WASM modules that cannot be bundled by webpack
    config.externals.push(
      'onnxruntime-node',
      'pdfjs-dist',
      'pdfjs-dist/legacy/build/pdf',
      '@napi-rs/canvas',
      'tesseract.js',
    );
    return config;
  },
}

module.exports = nextConfig
