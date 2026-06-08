import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';


const WMO_WEATHER_CODES = {
  0: { en: 'Clear Sky', hi: 'साफ़ आसमान' },
  1: { en: 'Mainly Clear', hi: 'मुख्य रूप से साफ़' },
  2: { en: 'Partly Cloudy', hi: 'आंशिक रूप से बादल' },
  3: { en: 'Overcast', hi: 'घने बादल' },
  45: { en: 'Foggy', hi: 'कोहरा' },
  48: { en: 'Depositing Rime Fog', hi: 'सघन कोहरा' },
  51: { en: 'Light Drizzle', hi: 'हल्की बूंदाबांदी' },
  53: { en: 'Moderate Drizzle', hi: 'मध्यम बूंदाबांदी' },
  55: { en: 'Dense Drizzle', hi: 'तेज़ बूंदाबांदी' },
  56: { en: 'Light Freezing Drizzle', hi: 'ठंडी बूंदाबांदी' },
  57: { en: 'Dense Freezing Drizzle', hi: 'सघन ठंडी बूंदाबांदी' },
  61: { en: 'Slight Rain', hi: 'हल्की बारिश' },
  63: { en: 'Moderate Rain', hi: 'मध्यम बारिश' },
  65: { en: 'Heavy Rain', hi: 'भारी बारिश' },
  66: { en: 'Light Freezing Rain', hi: 'ठंडी बारिश' },
  67: { en: 'Heavy Freezing Rain', hi: 'भारी ठंडी बारिश' },
  71: { en: 'Slight Snow Fall', hi: 'हल्की बर्फबारी' },
  73: { en: 'Moderate Snow Fall', hi: 'मध्यम बर्फबारी' },
  75: { en: 'Heavy Snow Fall', hi: 'भारी बर्फबारी' },
  77: { en: 'Snow Grains', hi: 'बर्फ के दाने' },
  80: { en: 'Slight Rain Showers', hi: 'हल्की बौछारें' },
  81: { en: 'Moderate Rain Showers', hi: 'मध्यम बौछारें' },
  82: { en: 'Violent Rain Showers', hi: 'तेज़ बौछारें' },
  85: { en: 'Slight Snow Showers', hi: 'हल्की बर्फबारी बौछार' },
  86: { en: 'Heavy Snow Showers', hi: 'भारी बर्फबारी बौछार' },
  95: { en: 'Thunderstorm', hi: 'गरज के साथ तूफान' },
  96: { en: 'Thunderstorm with Hail', hi: 'ओलावृष्टि के साथ तूफान' },
  99: { en: 'Heavy Thunderstorm', hi: 'भारी तूफान और ओलावृष्टि' },
};

const THEMES = {
  en: {
    morning: {
      label: 'Morning',
      greeting: 'Good Morning',
      desc: 'Fresh morning air! A perfect time to nurture your virtual tree.',
      colors: ['#FFF9C4', '#FFF59D', '#C8E6C9'],
      textColor: '#1B5E20',
      secTextColor: '#4CAF50',
    },
    afternoon: {
      label: 'Afternoon',
      greeting: 'Good Afternoon',
      desc: 'Bright sunny afternoon! Keep your plants and yourself hydrated.',
      colors: ['#E0F7FA', '#FFF9C4', '#A5D6A7'],
      textColor: '#0D47A1',
      secTextColor: '#2E7D32',
    },
    evening: {
      label: 'Evening',
      greeting: 'Good Evening',
      desc: 'Lovely evening breeze! Water your trees and check your daily tasks.',
      colors: ['#FF8A65', '#D1C4E9', '#311B92'],
      textColor: '#FFFFFF',
      secTextColor: '#E0F2F1',
    },
    night: {
      label: 'Night',
      greeting: 'Good Night',
      desc: 'Under the beautiful night sky, rest well and let your garden grow.',
      colors: ['#0F2027', '#203A43', '#2C5364'],
      textColor: '#ECEFF1',
      secTextColor: '#B0BEC5',
    },
    rainy: {
      label: 'Rainy',
      greeting: 'Rainy Weather',
      desc: 'Showers of rain! Nature is doing the watering for you today.',
      colors: ['#2B5876', '#4E4376', '#3A6073'],
      textColor: '#FFFFFF',
      secTextColor: '#ECEFF1',
    },
    cloudy: {
      label: 'Cloudy',
      greeting: 'Cloudy Skies',
      desc: 'Soft cloudy weather. Great atmosphere to complete daily missions.',
      colors: ['#757F9A', '#D7DDE8', '#B0C4DE'],
      textColor: '#1A303A',
      secTextColor: '#3E5C76',
    },
    snowy: {
      label: 'Snowy',
      greeting: 'Snowy Day',
      desc: 'Cold snowy environment! Keep cozy and cultivate your green space.',
      colors: ['#E0F7FA', '#B2EBF2', '#80DEEA'],
      textColor: '#006064',
      secTextColor: '#00838F',
    },
    foggy: {
      label: 'Foggy',
      greeting: 'Foggy Environment',
      desc: 'Misty landscapes today. Stay safe and watch your trees grow.',
      colors: ['#CFD8DC', '#90A4AE', '#78909C'],
      textColor: '#37474F',
      secTextColor: '#546E7A',
    },
  },
  hi: {
    morning: {
      label: 'सुबह',
      greeting: 'सुप्रभात',
      desc: 'ताज़ी सुबह की हवा! आपके वर्चुअल पेड़ को सींचने का सही समय है।',
      colors: ['#FFF9C4', '#FFF59D', '#C8E6C9'],
      textColor: '#1B5E20',
      secTextColor: '#4CAF50',
    },
    afternoon: {
      label: 'दोपहर',
      greeting: 'नमस्कार (दोपहर)',
      desc: 'तेज़ सुनहरी दोपहर! अपने पौधों को हरा-भरा रखें और पानी दें।',
      colors: ['#E0F7FA', '#FFF9C4', '#A5D6A7'],
      textColor: '#0D47A1',
      secTextColor: '#2E7D32',
    },
    evening: {
      label: 'शाम',
      greeting: 'शुभ संध्या',
      desc: 'शाम की ठंडी हवा! अपने पेड़ को सींचें और दैनिक मिशन पूरे करें।',
      colors: ['#FF8A65', '#D1C4E9', '#311B92'],
      textColor: '#FFFFFF',
      secTextColor: '#E0F2F1',
    },
    night: {
      label: 'रात',
      greeting: 'शुभ रात्रि',
      desc: 'तारों भरे आसमान के नीचे, आराम करें और अपने पेड़ को बढ़ने दें।',
      colors: ['#0F2027', '#203A43', '#2C5364'],
      textColor: '#ECEFF1',
      secTextColor: '#B0BEC5',
    },
    rainy: {
      label: 'बारिश',
      greeting: 'रिमझिम बारिश',
      desc: 'बारिश की बौछारें! आज प्रकृति आपके पेड़ों को खुद सींच रही है।',
      colors: ['#2B5876', '#4E4376', '#3A6073'],
      textColor: '#FFFFFF',
      secTextColor: '#ECEFF1',
    },
    cloudy: {
      label: 'बादल',
      greeting: 'बादल छाए हैं',
      desc: 'बादल छाए हुए हैं। आज दैनिक मिशन पूरे करने का सही मौका है।',
      colors: ['#757F9A', '#D7DDE8', '#B0C4DE'],
      textColor: '#1A303A',
      secTextColor: '#3E5C76',
    },
    snowy: {
      label: 'बर्फबारी',
      greeting: 'बर्फबारी का दिन',
      desc: 'ठंडी बर्फबारी का मौसम! घर में सुरक्षित रहें और ट्रीनीति खेलें।',
      colors: ['#E0F7FA', '#B2EBF2', '#80DEEA'],
      textColor: '#006064',
      secTextColor: '#00838F',
    },
    foggy: {
      label: 'कोहरा',
      greeting: 'कोहरे का मौसम',
      desc: 'चारों ओर धुंध है। सुरक्षित रहें और अपने पौधों की देखभाल करें।',
      colors: ['#CFD8DC', '#90A4AE', '#78909C'],
      textColor: '#37474F',
      secTextColor: '#546E7A',
    },
  },
};

const getEnvironmentType = (code, hour) => {
  // Check rain/thunderstorm
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(code)) {
    return 'rainy';
  }
  // Check snow
  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return 'snowy';
  }
  // Check fog
  if ([45, 48].includes(code)) {
    return 'foggy';
  }
  // Check cloudy
  if ([2, 3].includes(code)) {
    return 'cloudy';
  }

  // Time based logic if clear/sunny
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 20) return 'evening';
  return 'night';
};

const getEnvironmentIcon = (type) => {
  switch (type) {
    case 'morning':
      return <MaterialCommunityIcons name="weather-sunset-up" size={54} color="#E65100" />;
    case 'afternoon':
      return <MaterialCommunityIcons name="weather-sunny" size={58} color="#FFB300" />;
    case 'evening':
      return <MaterialCommunityIcons name="weather-sunset-down" size={54} color="#E64A19" />;
    case 'night':
      return <MaterialCommunityIcons name="weather-night" size={54} color="#FFF8E1" />;
    case 'rainy':
      return <MaterialCommunityIcons name="weather-pouring" size={54} color="#90CAF9" />;
    case 'cloudy':
      return <MaterialCommunityIcons name="weather-cloudy" size={54} color="#E0E0E0" />;
    case 'snowy':
      return <MaterialCommunityIcons name="weather-snowy" size={54} color="#E0F7FA" />;
    case 'foggy':
      return <MaterialCommunityIcons name="weather-fog" size={54} color="#ECEFF1" />;
    default:
      return <MaterialCommunityIcons name="weather-sunny" size={54} color="#FFB300" />;
  }
};

export default function EnvironmentCard({ language = 'en', userName = 'Gardener' }) {
  const [locationState, setLocationState] = useState({
    city: '',
    latitude: null,
    longitude: null,
    permissionStatus: null,
  });

  const [weatherState, setWeatherState] = useState({
    temp: null,
    code: null,
    wind: null,
    isDay: null,
    loading: true,
  });

  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Fetch weather and location
  const fetchAllData = async () => {
    // Start spin animation
    Animated.timing(rotateAnim, {
      toValue: 1,
      duration: 1000,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start(() => rotateAnim.setValue(0));

    setWeatherState((prev) => ({ ...prev, loading: true }));
    try {
      // 1. Get GPS permissions
      let { status } = await Location.requestForegroundPermissionsAsync();
      setLocationState((prev) => ({ ...prev, permissionStatus: status }));

      if (status !== 'granted') {
        setWeatherState((prev) => ({ ...prev, loading: false }));
        return;
      }

      // 2. Get GPS Location
      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;
      setLocationState((prev) => ({ ...prev, latitude, longitude }));

      // 3. Get City name using native reverse geocoding
      let reverseGeo = await Location.reverseGeocodeAsync({ latitude, longitude });
      let cityName = '';
      if (reverseGeo && reverseGeo.length > 0) {
        const addr = reverseGeo[0];
        cityName = addr.city || addr.district || addr.subregion || addr.region || addr.name || '';
      }
      setLocationState((prev) => ({ ...prev, city: cityName }));

      // 4. Get Weather data from Open-Meteo
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`
      );
      const weatherJson = await response.json();

      if (weatherJson && weatherJson.current_weather) {
        const current = weatherJson.current_weather;
        setWeatherState({
          temp: current.temperature,
          code: current.weathercode,
          wind: current.windspeed,
          isDay: current.is_day,
          loading: false,
        });
      } else {
        setWeatherState((prev) => ({ ...prev, loading: false }));
      }
    } catch (error) {
      console.log('Error fetching environment/weather:', error);
      setWeatherState((prev) => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    fetchAllData();

    // Check environment status every 15 minutes to keep it real-time
    const interval = setInterval(fetchAllData, 15 * 60 * 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const hour = new Date().getHours();
  // Determine weather code fallback: if API loading or failed, map based on time of day
  const activeCode = weatherState.code !== null ? weatherState.code : 0;
  const envType = getEnvironmentType(activeCode, hour);
  const langKey = language === 'hi' ? 'hi' : 'en';
  const theme = THEMES[langKey][envType] || THEMES[langKey].morning;

  // Localized general string resources
  const strings = {
    en: {
      title: 'Real-time Environment',
      loading: 'Updating environment details...',
      permissionTitle: 'GPS Access Needed',
      permissionMsg: 'Allow location to see real-time local weather.',
      retryBtn: 'Grant Access',
      wind: 'Wind',
      humidity: 'Temp',
      status: 'Status',
    },
    hi: {
      title: 'सच्चा वातावरण',
      loading: 'वातावरण अपडेट हो रहा है...',
      permissionTitle: 'GPS अनुमति चाहिए',
      permissionMsg: 'स्थानीय मौसम की जानकारी देखने के लिए स्थान अनुमति दें।',
      retryBtn: 'अनुमति दें',
      wind: 'हवा की गति',
      humidity: 'तापमान',
      status: 'स्थिति',
    },
  };

  const currentStrings = strings[langKey];

  return (
    <View style={styles.cardWrapper}>
      <LinearGradient
        colors={theme.colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGradient}
      >
        <View style={styles.cardInner}>
          {/* Header row: Title + Refresh */}
          <View style={styles.cardHeader}>
            <View style={styles.headerTitleBox}>
              <FontAwesome5 name="seedling" size={14} color={theme.textColor} style={{ marginRight: 6 }} />
              <Text style={[styles.cardTitle, { color: theme.textColor }]}>
                {theme.greeting}, {userName}!
              </Text>
            </View>
            <TouchableOpacity onPress={fetchAllData} activeOpacity={0.7} style={styles.refreshBtn}>
              <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <Ionicons name="refresh-outline" size={18} color={theme.textColor} />
              </Animated.View>
            </TouchableOpacity>
          </View>

          {/* Main Weather Content */}
          {weatherState.loading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="small" color={theme.textColor} />
              <Text style={[styles.loaderText, { color: theme.textColor }]}>
                {currentStrings.loading}
              </Text>
            </View>
          ) : locationState.permissionStatus !== 'granted' ? (
            <View style={styles.permissionBox}>
              <View style={styles.permissionTextCol}>
                <Text style={[styles.permissionTitle, { color: theme.textColor }]}>
                  {currentStrings.permissionTitle}
                </Text>
                <Text style={[styles.permissionSub, { color: theme.textColor }]}>
                  {currentStrings.permissionMsg}
                </Text>
              </View>
              <TouchableOpacity style={[styles.grantBtn, { backgroundColor: theme.textColor }]} onPress={fetchAllData}>
                <Text style={styles.grantBtnText}>{currentStrings.retryBtn}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.mainInfo}>
              <View style={styles.infoLeft}>
                {weatherState.temp !== null && (
                  <Text style={[styles.tempText, { color: theme.textColor }]}>
                    {weatherState.temp}°C
                  </Text>
                )}
                <Text style={[styles.conditionText, { color: theme.textColor }]}>
                  {WMO_WEATHER_CODES[weatherState.code]?.[langKey] || (langKey === 'hi' ? 'साफ़ मौसम' : 'Clear Sky')}
                </Text>
                <Text style={[styles.descText, { color: theme.textColor }]}>
                  {theme.desc}
                </Text>
              </View>
              <View style={styles.infoRight}>
                {getEnvironmentIcon(envType)}
              </View>
            </View>
          )}

          {/* Footer details row */}
          {!weatherState.loading && locationState.permissionStatus === 'granted' && (
            <View style={[styles.cardFooter, { borderTopColor: theme.secTextColor + '40' }]}>
              <View style={styles.footerItem}>
                <Ionicons name="location" size={12} color={theme.textColor} style={{ marginRight: 4 }} />
                <Text style={[styles.footerText, { color: theme.textColor }]} numberOfLines={1}>
                  {locationState.city || 'My Garden'}
                </Text>
              </View>
              <View style={styles.footerDivider} />
              <View style={styles.footerItem}>
                <Ionicons name="time" size={12} color={theme.textColor} style={{ marginRight: 4 }} />
                <Text style={[styles.footerText, { color: theme.textColor }]}>
                  {theme.label}
                </Text>
              </View>
              {weatherState.wind !== null && (
                <>
                  <View style={styles.footerDivider} />
                  <View style={styles.footerItem}>
                    <Ionicons name="wind" size={12} color={theme.textColor} style={{ marginRight: 4 }} />
                    <Text style={[styles.footerText, { color: theme.textColor }]}>
                      {weatherState.wind} km/h
                    </Text>
                  </View>
                </>
              )}
            </View>
          )}
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    marginHorizontal: 15,
    borderRadius: 25,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    marginBottom: 15,
    marginTop: 10,
  },
  cardGradient: {
    width: '100%',
  },
  cardInner: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  refreshBtn: {
    padding: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 12,
  },
  loaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    justifyContent: 'center',
  },
  loaderText: {
    marginLeft: 10,
    fontSize: 13,
    fontWeight: '600',
  },
  permissionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  permissionTextCol: {
    flex: 1,
    paddingRight: 10,
  },
  permissionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  permissionSub: {
    fontSize: 11,
    opacity: 0.8,
  },
  grantBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  grantBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  mainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  infoLeft: {
    flex: 1,
    paddingRight: 10,
  },
  tempText: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
  },
  conditionText: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: -2,
    marginBottom: 6,
  },
  descText: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    opacity: 0.9,
  },
  infoRight: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 12,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    fontSize: 11,
    fontWeight: '700',
  },
  footerDivider: {
    width: 1,
    height: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    marginHorizontal: 10,
  },
});
