/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@chipboard/database", "@chipboard/sales", "@chipboard/shared"],
};

export default nextConfig;
