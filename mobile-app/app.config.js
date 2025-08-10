// app.config.js
import 'dotenv/config';

export default {
  expo: {
    name: 'mobile-app',
    slug: 'mobile-app',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'mobileapp',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
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
    ],
    extra: {
      googleMapsApiKey: process.env.GOOGLE_API_KEY,
    },
    experiments: {
      typedRoutes: true,
    },
    extra: {
      googleMapsApiKey: process.env.GOOGLE_API_KEY,
    },
    extra: {
      apiUrl: "https://tf95p1362f.execute-api.us-west-2.amazonaws.com",
      cognitoRegion: "us-west-1",
      cognitoUserPoolId: "us-west-1_NNGeSDxTP",
      cognitoAppClientId: "32bvrqma8qafn20tj6ki325grc",
      googleMapsApiKey: process.env.GOOGLE_API_KEY,
    },
  },
};
