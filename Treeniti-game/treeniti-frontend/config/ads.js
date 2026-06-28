import React from 'react';
import { View, Text, Alert, Platform } from 'react-native';
import Constants from 'expo-constants';

// Set FORCE_TEST_ADS to true to load Google's official demo/test ads in release/APK builds.
// Set to false to use your real production AdMob ad units when releasing the app to play store.
export const FORCE_TEST_ADS = false;

// ----------------------------------------------------
// 1. MOCK CLASSES FOR EXPO GO / WEB / FALLBACK
// ----------------------------------------------------
class MockInterstitialAd {
  static createForAdRequest(adUnitId, options) {
    return new MockInterstitialAd();
  }
  loaded = true;
  listeners = {};

  addAdEventListener(eventType, callback) {
    if (!this.listeners[eventType]) this.listeners[eventType] = [];
    this.listeners[eventType].push(callback);
    
    // Trigger loaded automatically in mock mode
    if (eventType === 'loaded') {
      setTimeout(() => callback(), 100);
    }

    return () => {
      this.listeners[eventType] = this.listeners[eventType].filter(cb => cb !== callback);
    };
  }

  load() {
    this.loaded = true;
  }

  show() {
    Alert.alert(
      "Ads (Mock Mode)",
      "This is a Google Full Screen Interstitial Ad demo.",
      [
        {
          text: "Close Ad",
          onPress: () => {
            if (this.listeners['closed']) {
              this.listeners['closed'].forEach(cb => cb());
            }
          }
        }
      ]
    );
  }
}

class MockRewardedAd {
  static createForAdRequest(adUnitId, options) {
    return new MockRewardedAd();
  }
  loaded = true;
  listeners = {};

  addAdEventListener(eventType, callback) {
    if (!this.listeners[eventType]) this.listeners[eventType] = [];
    this.listeners[eventType].push(callback);

    if (eventType === 'loaded') {
      setTimeout(() => callback(), 100);
    }

    return () => {
      this.listeners[eventType] = this.listeners[eventType].filter(cb => cb !== callback);
    };
  }

  load() {
    this.loaded = true;
  }

  show() {
    Alert.alert(
      "Video Ad (Mock Mode)",
      "Watch this demo video to receive your coins reward!",
      [
        {
          text: "Claim Reward 🪙",
          onPress: () => {
            if (this.listeners['earned_reward']) {
              this.listeners['earned_reward'].forEach(cb => cb({ type: 'coins', amount: 10 }));
            }
            if (this.listeners['closed']) {
              this.listeners['closed'].forEach(cb => cb());
            }
          }
        },
        {
          text: "Cancel",
          onPress: () => {
            if (this.listeners['closed']) {
              this.listeners['closed'].forEach(cb => cb());
            }
          }
        }
      ]
    );
  }
}

// ----------------------------------------------------
// 2. CHECK ADMOB AVAILABILITY & EXPORT CLASSES
// ----------------------------------------------------
let googleMobileAds = null;
let isAdmobAvailable = false;
export let adInitPromise = null;

try {
  const isExpoGo = Constants.appOwnership === 'expo';
  const isWeb = Platform.OS === 'web';

  if (!isExpoGo && !isWeb) {
    googleMobileAds = require('react-native-google-mobile-ads');
    isAdmobAvailable = true;
  }
} catch (error) {
  console.log("Error checking/loading AdMob SDK:", error);
  isAdmobAvailable = false;
}

export const InterstitialAd = (isAdmobAvailable && googleMobileAds?.InterstitialAd)
  ? googleMobileAds.InterstitialAd
  : MockInterstitialAd;

export const RewardedAd = (isAdmobAvailable && googleMobileAds?.RewardedAd)
  ? googleMobileAds.RewardedAd
  : MockRewardedAd;

export const BannerAdSize = (isAdmobAvailable && googleMobileAds?.BannerAdSize)
  ? googleMobileAds.BannerAdSize 
  : { ANCHORED_ADAPTIVE_BANNER: 'BANNER' };

export const AdEventType = (isAdmobAvailable && googleMobileAds?.AdEventType)
  ? googleMobileAds.AdEventType 
  : { LOADED: 'loaded', CLOSED: 'closed' };

export const RewardedAdEventType = (isAdmobAvailable && googleMobileAds?.RewardedAdEventType)
  ? googleMobileAds.RewardedAdEventType 
  : { LOADED: 'loaded', EARNED_REWARD: 'earned_reward', CLOSED: 'closed' };

export const BannerAd = (isAdmobAvailable && googleMobileAds?.BannerAd)
  ? googleMobileAds.BannerAd 
  : (props) => (
      <View style={{
        height: 50,
        backgroundColor: '#E8F5E9',
        borderWidth: 1,
        borderColor: '#81C784',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        marginVertical: 4,
      }}>
        <Text style={{ color: '#1B5E20', fontSize: 11, fontWeight: 'bold' }}>
          [Google Banner Ad - Demo Mode]
        </Text>
      </View>
    );

// ----------------------------------------------------
// 3. AD UNIT IDs
// ----------------------------------------------------
export const AD_UNITS = {
  BANNER: (FORCE_TEST_ADS || __DEV__)
    ? (isAdmobAvailable && googleMobileAds?.TestIds?.BANNER ? googleMobileAds.TestIds.BANNER : 'ca-app-pub-3940256099942544/6300978111')
    : 'ca-app-pub-9702132255395061/3725548626',
  INTERSTITIAL: (FORCE_TEST_ADS || __DEV__)
    ? (isAdmobAvailable && googleMobileAds?.TestIds?.INTERSTITIAL ? googleMobileAds.TestIds.INTERSTITIAL : 'ca-app-pub-3940256099942544/1033173712')
    : 'ca-app-pub-9702132255395061/6160140271',
  REWARDED: (FORCE_TEST_ADS || __DEV__)
    ? (isAdmobAvailable && googleMobileAds?.TestIds?.REWARDED ? googleMobileAds.TestIds.REWARDED : 'ca-app-pub-3940256099942544/5224354917')
    : 'ca-app-pub-9702132255395061/2643036865',
};

// ----------------------------------------------------
// 4. GLOBAL PRE-LOADED AD INSTANCES (SINGLETONS)
// ----------------------------------------------------
export let globalRewardedAd = null;
export let globalInterstitialAd = null;

const createGlobalAds = () => {
  try {
    globalRewardedAd = RewardedAd.createForAdRequest(AD_UNITS.REWARDED, {
      requestNonPersonalizedAdsOnly: true,
    });
    globalRewardedAd.load();
  } catch (e) {
    console.log("Error creating globalRewardedAd:", e);
  }

  try {
    globalInterstitialAd = InterstitialAd.createForAdRequest(AD_UNITS.INTERSTITIAL, {
      requestNonPersonalizedAdsOnly: true,
    });
    globalInterstitialAd.load();
  } catch (e) {
    console.log("Error creating globalInterstitialAd:", e);
  }
};

// Start initialization
if (isAdmobAvailable && googleMobileAds) {
  const mobileAds = googleMobileAds.default || googleMobileAds;
  if (typeof mobileAds === 'function') {
    adInitPromise = mobileAds()
      .initialize()
      .then((adapterStatuses) => {
        console.log('AdMob SDK initialized successfully:', adapterStatuses);
        createGlobalAds();
        return adapterStatuses;
      })
      .catch((err) => {
        console.log('AdMob SDK initialization failed:', err);
        createGlobalAds(); // Fallback creation if initialization fails
        return null;
      });
  } else {
    createGlobalAds();
  }
} else {
  // If native AdMob is not available (Expo Go / Web), create mock singletons immediately
  createGlobalAds();
}
