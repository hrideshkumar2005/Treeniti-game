import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function HelpScreen() {
    const router = useRouter();
    
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#1B5E20" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Help & Support (FAQ)</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
                
                <FAQItem 
                    question="How do I level up my tree?" 
                    answer="Water your tree daily to gain growth points. Once you hit 100%, your tree levels up (Seed -> Sapling -> Mature, etc.). High-level trees sprout fruits!" 
                />
                
                <FAQItem 
                    question="How can I earn real money?" 
                    answer="Grow your tree to the 'Mature' stage. You can then harvest fruits and Golden Fruits. These fruits are converted to Coins, which can be withdrawn as Cash to your UPI ID." 
                />

                <FAQItem 
                    question="What is the Shake Tree minigame?" 
                    answer="Shaking the tree has a chance to drop bonus coins. You can shake once every 2 hours. Be careful not to spam or you'll be flagged for verification!" 
                />

                <FAQItem 
                    question="How do referrals work?" 
                    answer="Share your unique referral code. When your friends signup and they grow their trees, you earn a commission from their active levels!" 
                />

                <FAQItem 
                    question="My withdrawal is pending, why?" 
                    answer="All withdrawals undergo manual verification by our admins to ensure security and policy compliance. This typically takes 24-48 hours." 
                />

                <View style={styles.contactCard}>
                    <Text style={styles.contactTitle}>Still need help?</Text>
                    <Text style={styles.contactSub}>Reach out to our supporting team at:</Text>
                    <TouchableOpacity style={styles.emailBtn}>
                        <Ionicons name="mail" size={18} color="#fff" />
                        <Text style={styles.emailText}>support@treeniti.com</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const FAQItem = ({ question, answer }) => {
    const [expanded, setExpanded] = useState(false);

    return (
        <TouchableOpacity style={styles.faqCard} onPress={() => setExpanded(!expanded)} activeOpacity={0.8}>
            <View style={styles.faqHeader}>
                <Text style={styles.question}>{question}</Text>
                <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={20} color="#1B5E20" />
            </View>
            {expanded && (
                <Text style={styles.answer}>{answer}</Text>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5FAF5' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20 },
    backBtn: { padding: 5, marginRight: 15 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1B5E20' },
    scrollContent: { padding: 20 },
    sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#1B5E20', marginBottom: 20 },
    faqCard: { backgroundColor: '#fff', borderRadius: 15, padding: 15, marginBottom: 12, elevation: 2 },
    faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    question: { fontSize: 14, fontWeight: 'bold', color: '#333', flex: 1, marginRight: 10 },
    answer: { fontSize: 13, color: '#666', marginTop: 10, lineHeight: 18 },
    contactCard: { backgroundColor: '#1B5E20', borderRadius: 20, padding: 25, marginTop: 30, alignItems: 'center' },
    contactTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
    contactSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginBottom: 15 },
    emailBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 30 },
    emailText: { color: '#fff', fontWeight: 'bold', marginLeft: 10 }
});
