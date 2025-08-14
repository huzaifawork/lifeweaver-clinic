import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      // Real image domains will be added here when needed
    ],
  },
  webpack: (config, { isServer }) => {
    // Exclude googleapis and related packages from client bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
      };

      config.externals = config.externals || [];
      config.externals.push({
        'googleapis': 'commonjs googleapis',
        'google-auth-library': 'commonjs google-auth-library',
        'gcp-metadata': 'commonjs gcp-metadata',
        'gtoken': 'commonjs gtoken',
        'jws': 'commonjs jws',
        'mime': 'commonjs mime',
      });
    }

    return config;
  },
};

export default nextConfig;
