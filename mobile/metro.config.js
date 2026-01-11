/**
 * Metro configuration for React Native / Expo
 * Includes source map configuration for proper error symbolication
 */

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable source maps for better error tracing
config.transformer = {
  ...config.transformer,
  minifierPath: 'metro-minify-terser',
  minifierConfig: {
    // Keep source maps for debugging
    sourceMap: {
      includeSources: true,
    },
  },
};

// Enable inline source maps
config.resolver = {
  ...config.resolver,
  sourceExts: [...config.resolver.sourceExts, 'mjs'],
};

module.exports = config;
