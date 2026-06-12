import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PrivacyPolicy() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1B5E20" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.card}>
            <Text style={styles.sectionTitle}>1. Data Collection</Text>
            <Text style={styles.text}>
              Treeniti collects minimal user data including mobile number, name, email address, and device ID to ensure account security and prevent fraud.
            </Text>

            <Text style={styles.sectionTitle}>2. Location Services</Text>
            <Text style={styles.text}>
              We may request location access when you upload real plantation photos to verify the authenticity of the planting activity.
            </Text>

            <Text style={styles.sectionTitle}>3. Reward Verification</Text>
            <Text style={styles.text}>
              All rewards are subject to anti-fraud checks. Multiple accounts on a single device or automated (bot) activity will result in account restriction.
            </Text>

            <Text style={styles.sectionTitle}>4. Google Play Compliance</Text>
            <Text style={styles.text}>
              Treeniti complies with all Google Play Store policies regarding gamification and real-money rewards. This app is for users 13+ only (18+ for monetary withdrawals).
            </Text>

            <Text style={styles.sectionTitle}>5. Data Retention Policy</Text>
            <Text style={styles.text}>
              We retain your personal data (name, email, and mobile number) and app activity data only for as long as your account remains active. If your account is inactive or you request its deletion, your personal data will be permanently deleted from our active servers within 30 days. System and device logs collected for security and fraud detection are retained for a maximum of 90 days.
            </Text>

            <Text style={styles.sectionTitle}>6. Data Deletion Rights</Text>
            <Text style={styles.text}>
              You have the right to request the deletion of your account and all associated user data at any time. You can request account deletion via the in-app support options, by sending an email to treenitiofficial@gmail.com, or by using the deletion request form on our website.
            </Text>

            <View style={styles.divider} />
            <Text style={styles.footer}>Last updated: June 2026</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F8F4' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: '#fff', elevation: 2 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1B5E20' },
  content: { padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 25, elevation: 3 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1B5E20', marginTop: 20, marginBottom: 10 },
  text: { fontSize: 14, color: '#444', lineHeight: 22 },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 30 },
  footer: { fontSize: 12, color: '#999', textAlign: 'center' }
});
