const apiUpstream = (
  process.env.API_UPSTREAM ||
  (process.env.NODE_ENV === "production"
    ? "https://corsair-taskflow.site/api/v1"
    : "http://localhost:8000/api/v1")
).replace(/\/$/, "")

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiUpstream}/:path*`,
      },
    ]
  },
}

export default nextConfig
