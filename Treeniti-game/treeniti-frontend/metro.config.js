// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// 🔧 Fix: Prevent duplicate Three.js instances (THREE.WARNING fix)
// Forces all imports of 'three' to resolve to the same single copy.
config.resolver = config.resolver || {};
config.resolver.extraNodeModules = {
    ...config.resolver.extraNodeModules,
    three: path.resolve(__dirname, 'node_modules/three'),
};

module.exports = config;
