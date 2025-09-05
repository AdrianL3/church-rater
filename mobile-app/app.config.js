// mobile-app/app.config.js
import 'dotenv/config';

export default {
  expo: {
    name: 'churchfinder',
    slug: 'church-finder',
    version: '1.0.1',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'mobileapp',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.adrianl3.churchfinder',
      buildNumber: '7',
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          'We use your location to show nearby churches and Mass times.',
        NSCameraUsageDescription: "We use your camera so you can take photos of churches you visit.",
        NSPhotoLibraryUsageDescription: "We use your photo library so you can select and upload church visit photos.",
        NSPhotoLibraryAddUsageDescription: "We save photos you take to your photo library if you choose to do so.",
      },
      config: {
        googleMapsApiKey: process.env.GOOGLE_API_KEY, // ✅ iOS native Maps SDK
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
      config: {
        apiKey: process.env.GOOGLE_API_KEY, // ✅ Android native Maps SDK
      },
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
    experiments: { typedRoutes: true },

    // >>> Single 'extra' block — include your keys + eas.projectId
    extra: {
      apiUrl: 'https://tf95p1362f.execute-api.us-west-2.amazonaws.com',
      cognitoRegion: 'us-west-1',
      cognitoUserPoolId: 'us-west-1_NNGeSDxTP',
      cognitoAppClientId: '32bvrqma8qafn20tj6ki325grc',
      googleMapsApiKey: process.env.GOOGLE_API_KEY,
      eas: {
        projectId: 'f408f459-1f81-4dd3-8532-04432aa4d772',
      },
    },
  },
};
