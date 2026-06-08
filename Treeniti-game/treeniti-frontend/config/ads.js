import React from 'react';
import { View, Text, Alert } from 'react-native';

// Try to safely import react-native-google-mobile-ads
let googleMobileAds = null;
let isAdmobAvailable = false;

try {
  googleMobileAds = require('react-native-google-mobile-ads');
  isAdmobAvailable = true;
  
  // Safely initialize the Mobile Ads SDK
  const mobileAds = googleMobileAds.default || googleMobileAds;
  if (typeof mobileAds === 'function') {
    mobileAds()
      .initialize()
      .then((adapterStatuses) => {
        console.log('AdMob SDK initialized successfully:', adapterStatuses);
      })
      .catch((err) => {
        console.log('AdMob SDK initialization failed:', err);
      });
  }
} catch (error) {
  console.log("AdMob native modules not found, falling back to simulator mock ads.");
  isAdmobAvailable = false;
}

// ----------------------------------------------------
// 1. AD UNIT IDs
// ----------------------------------------------------
export const AD_UNITS = {
  BANNER: __DEV__
    ? (isAdmobAvailable ? googleMobileAds.TestIds.BANNER : 'mock-banner')
    : 'ca-app-pub-9702132255395061/3725548626',
  INTERSTITIAL: __DEV__
    ? (isAdmobAvailable ? googleMobileAds.TestIds.INTERSTITIAL : 'mock-interstitial')
    : 'ca-app-pub-9702132255395061/6160140271',
  REWARDED: __DEV__
    ? (isAdmobAvailable ? googleMobileAds.TestIds.REWARDED : 'mock-rewarded')
    : 'ca-app-pub-9702132255395061/2643036865',
};

// ----------------------------------------------------
// 2. EXPORTS & FALLBACKS
// ----------------------------------------------------

// BannerAdSize export
export const BannerAdSize = isAdmobAvailable 
  ? googleMobileAds.BannerAdSize 
  : { ANCHORED_ADAPTIVE_BANNER: 'BANNER' };

// AdEventType export
export const AdEventType = isAdmobAvailable 
  ? googleMobileAds.AdEventType 
  : { LOADED: 'loaded', CLOSED: 'closed' };

// RewardedAdEventType export
export const RewardedAdEventType = isAdmobAvailable 
  ? googleMobileAds.RewardedAdEventType 
  : { LOADED: 'loaded', EARNED_REWARD: 'earned_reward', CLOSED: 'closed' };

// BannerAd component wrapper
export const BannerAd = isAdmobAvailable 
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

// InterstitialAd wrapper class
export const InterstitialAd = isAdmobAvailable
  ? googleMobileAds.InterstitialAd
  : class MockInterstitialAd {
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
    };

// RewardedAd wrapper class
export const RewardedAd = isAdmobAvailable
  ? googleMobileAds.RewardedAd
  : class MockRewardedAd {
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
    };
