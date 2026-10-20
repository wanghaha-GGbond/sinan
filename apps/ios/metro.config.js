const { getDefaultConfig } = require("expo/metro-config")

// Expo SDK 54 detects npm workspaces and configures monorepo resolution.
// Manual watchFolders/nodeModulesPaths overrides prevent Expo Router's
// Babel transform from receiving its static route root during export.
module.exports = getDefaultConfig(__dirname)
