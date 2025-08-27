// app.config.js
import 'dotenv/config';

export default {
  expo: {
    name: 'churchfinder',
    slug: 'church-finder',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'mobileapp',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.adrianl3.churchfinder',
      buildNumber: '1',
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          'We use your location to show nearby churches',
        NSPhotoLibraryAddUsageDescription:
          'Allow adding photos to church notes.',
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#ffffff',
        },
      ],
      'expo-location',
    ],
    extra: {
      apiUrl: 'https://tf95p1362f.execute-api.us-west-2.amazonaws.com',
      cognitoRegion: 'us-west-1',
      cognitoUserPoolId: 'us-west-1_NNGeSDxTP',
      cognitoAppClientId: '32bvrqma8qafn20tj6ki325grc',
      googleMapsApiKey: process.env.GOOGLE_API_KEY,
    },
    experiments: {
      typedRoutes: true,
    },
  },
};
