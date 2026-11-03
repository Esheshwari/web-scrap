const projectId = process.env.EXPO_PROJECT_ID;

module.exports = {
  expo: {
    name: 'B2B Lead Finder',
    slug: 'b2b-lead-finder',
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    platforms: ['android', 'ios', 'web'],
    android: {
      package: 'com.example.b2bleadfinder',
      usesCleartextTraffic: true,
    },
    extra: projectId ? { eas: { projectId } } : {},
  },
};
