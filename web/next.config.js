/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow remote product images from retailer CDNs
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn11.bigcommerce.com' },  // Coolblades
      { protocol: 'https', hostname: 'cdn.shopify.com' },         // Salons Direct, JRL, Tomb45
      { protocol: 'https', hostname: 'm.media-amazon.com' },      // Amazon
      { protocol: 'https', hostname: 'images-eu.ssl-images-amazon.com' },
    ],
  },
};
module.exports = nextConfig;
