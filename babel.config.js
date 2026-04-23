module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['.'],
          alias: {
            '@/components': './components',
            '@/hooks':      './hooks',
            '@/lib':        './lib',
            '@/store':      './store',
            '@/types':      './types',
            '@/constants':  './constants',
            '@/assets':     './assets',
          },
          extensions: ['.ios.ts', '.android.ts', '.ts', '.tsx', '.js', '.jsx', '.json'],
        },
      ],
      'react-native-reanimated/plugin', // ← MUST stay last, always
    ],
  };
};