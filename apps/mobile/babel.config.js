const path = require('path');

const expoRouterRoot = path.dirname(require.resolve('expo-router/package.json'));
const routerAppRoot = path.relative(expoRouterRoot, path.resolve(__dirname, 'app')).replace(/\\/g, '/');

process.env.EXPO_ROUTER_APP_ROOT = routerAppRoot;
process.env.EXPO_ROUTER_IMPORT_MODE = 'sync';

module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: [
      [
        'transform-inline-environment-variables',
        {
          include: ['EXPO_ROUTER_APP_ROOT', 'EXPO_ROUTER_IMPORT_MODE'],
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};