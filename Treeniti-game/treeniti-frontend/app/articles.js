import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Dimensions, Alert, ActivityIndicator, AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BASE_URL from '../config/api';

export default function Articles() {
  const router = useRouter();
  const [articles, setArticles] = useState([]);
  const [activeArticle, setActiveArticle] = useState(null);
  const [timerRemaining, setTimerRemaining] = useState(0);
  const [isReading, setIsReading] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [appState, setAppState] = useState(AppState.currentState);
  const timerRef = useRef(null);

  const fetchArticles = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await fetch(`${BASE_URL}/articles`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if(data.success && data.articles) setArticles(data.articles);
    } catch(e) {}
  };

  useFocusEffect(useCallback(()=>{ fetchArticles(); }, []));

  // --- 📱 APP FOCUS DETECTION (SRS 3.9) ---
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        console.log('App has come to the foreground!');
      } else if (nextAppState.match(/inactive|background/)) {
        setIsReading(false); // Pause reading timer on background
      }
      setAppState(nextAppState);
    });
    return () => subscription.remove();
  }, [appState]);

  const startReading = (article) => {
      setActiveArticle(article);
      setTimerRemaining(article.requiredReadingTimeSec);
      setIsReading(true);
      setHasScrolledToBottom(false);
  };

  useEffect(() => {
     if(isReading && timerRemaining > 0) {
         timerRef.current = setTimeout(() => {
             setTimerRemaining(prev => prev - 1);
         }, 1000);
     } else if (isReading && timerRemaining === 0) {
         if (!hasScrolledToBottom) {
             Alert.alert("Scroll Required", "Please read the full article by scrolling to the bottom to claim points!");
             setIsReading(false); 
         } else {
             handleClaimReward();
         }
     }
     return () => clearTimeout(timerRef.current);
  }, [isReading, timerRemaining, hasScrolledToBottom]);

  const handleScroll = ({ nativeEvent }) => {
      const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
      const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;
      if (isCloseToBottom && !hasScrolledToBottom) {
          setHasScrolledToBottom(true);
      }
  };

  const handleClaimReward = async () => {
      setIsReading(false);
      try {
         const token = await AsyncStorage.getItem('userToken');
         const res = await fetch(`${BASE_URL}/articles/read`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ articleId: activeArticle._id, timeSpentSec: activeArticle.requiredReadingTimeSec })
         });
         const data = await res.json();
         if(data.success) {
            Alert.alert("Success!", "Reward claimed! + " + activeArticle.readingRewardCoins + " Coins");
            fetchArticles();
         }
         setActiveArticle(null);
      } catch (e) { }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => activeArticle ? setActiveArticle(null) : router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1B5E20" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{activeArticle ? "Reading Knowledge" : "Knowledge Base"}</Text>
      </View>

      {!activeArticle ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {articles.map((item) => (
            <View key={item._id} style={styles.articleCard}>
              <View style={styles.cardContent}>
                <Text style={styles.cardHeading}>{item.title}</Text>
                <Text style={styles.cardDesc} numberOfLines={2}>{item.content}</Text>
                <View style={styles.footerRow}>
                  <View>
                    <Text style={styles.statText}><Ionicons name="time" size={12}/> {item.requiredReadingTimeSec}s</Text>
                    <Text style={styles.statText}><FontAwesome5 name="coins" size={10}/> {item.readingRewardCoins} Coins</Text>
                  </View>
                  <TouchableOpacity style={styles.readBtn} onPress={() => startReading(item)}>
                    <Text style={styles.readBtnText}>Read & Earn</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={{flex: 1}}>
          <View style={styles.timerBar}>
              <Text style={styles.timerText}>{timerRemaining}s Remaining</Text>
              {hasScrolledToBottom && <Ionicons name="checkmark-circle" size={20} color="white" />}
          </View>
          <ScrollView 
            contentContainerStyle={styles.articleScroll} 
            onScroll={handleScroll} 
            scrollEventThrottle={16}
          >
            <Text style={styles.fullTitle}>{activeArticle.title}</Text>
            <Text style={styles.fullContent}>{activeArticle.content}</Text>
            <View style={{height: 100}} />
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FDF9' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 15 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1B5E20' },
  scrollContent: { padding: 20 },
  articleCard: { backgroundColor: '#fff', borderRadius: 20, padding: 15, marginBottom: 15, elevation: 3 },
  cardHeading: { fontSize: 16, fontWeight: 'bold' },
  cardDesc: { color: '#666', marginVertical: 8 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statText: { fontSize: 11, color: '#444' },
  readBtn: { backgroundColor: '#1B5E20', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 10 },
  readBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  timerBar: { backgroundColor: '#1B5E20', padding: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  timerText: { color: '#fff', fontWeight: 'bold' },
  articleScroll: { padding: 20 },
  fullTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  fullContent: { fontSize: 15, lineHeight: 24, color: '#333' }
});
