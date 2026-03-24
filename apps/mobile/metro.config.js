const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const expoRouterRoot = path.dirname(require.resolve('expo-router/package.json'));
const routerAppRoot = path.relative(expoRouterRoot, path.resolve(__dirname, 'app')).replace(/\\/g, '/');

process.env.EXPO_ROUTER_APP_ROOT = routerAppRoot;

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

// Build the base config FIRST, with our custom resolver, so that when
// withNativeWind (via withCssInterop) captures it as `originalResolver`,
// the chain is: NativeWind CSS resolver → our resolver → Metro default.
const baseConfig = getDefaultConfig(projectRoot);

// Monorepo: Metro must watch the full workspace root so it can serve
// packages from root node_modules (e.g. @expo/metro-runtime).
baseConfig.watchFolders = [workspaceRoot];
baseConfig.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
baseConfig.resolver.extraNodeModules = {
  react: path.resolve(workspaceRoot, 'node_modules/react'),
  'react/jsx-runtime': path.resolve(workspaceRoot, 'node_modules/react/jsx-runtime.js'),
  'react/jsx-dev-runtime': path.resolve(workspaceRoot, 'node_modules/react/jsx-dev-runtime.js'),
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
};

// Handle web-streams-polyfill/ponyfill/es6 resolution.
// MUST be set before withNativeWind so its CSS resolver chains on top.
baseConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'web-streams-polyfill/ponyfill/es6') {
    try {
      return {
        filePath: require.resolve('web-streams-polyfill/ponyfill/es6'),
        type: 'sourceFile',
      };
    } catch {
      return {
        filePath: require.resolve('web-streams-polyfill'),
        type: 'sourceFile',
      };
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

// withNativeWind wraps the resolver above so CSS virtual modules resolve correctly.
module.exports = withNativeWind(baseConfig, {
  input: './global.css',
});
