const projectId = process.env.EXPO_PROJECT_ID || '43328eff-a516-4046-ba91-b7fa30cb308f';

module.exports = {
  expo: {
    name: 'B2B Lead Finder',
    slug: 'b2b-lead-finder',
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    platforms: ['android', 'ios', 'web'],
    plugins: ['expo-asset'],
    android: {
      package: 'com.example.b2bleadfinder',
      usesCleartextTraffic: true,
    },
    extra: projectId ? { eas: { projectId } } : {},
  },
};
