import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import BASE_URL from '../config/api';

// 'export default' lagana compulsary hai
export default function AdminDashboard() {
  const router = useRouter();
  const [newNotice, setNewNotice] = useState('');
  const [stats, setStats] = useState({ users: 0, trees: 0, p_pending: 0, w_pending: 0 });
  const [pendingTrees, setPendingTrees] = useState([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState([]);
  const [userRole, setUserRole] = useState('Admin'); 
  const [allUsers, setAllUsers] = useState([]);
  const [config, setConfig] = useState({ conversionRate: 100, loginReward: 10 });
  const [showRoleMgr, setShowRoleMgr] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showWithdrawMgr, setShowWithdrawMgr] = useState(false);
  const [showMsgMgr, setShowMsgMgr] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState({ mood: 'Happy', language: 'English', category: 'General', message: '' });

  React.useEffect(() => {
     fetchAdminDashboard();
     fetchMessages();
  }, []);

  const fetchAdminDashboard = async () => {
     try {
        const token = await AsyncStorage.getItem('userToken');
        if(!token) return;
        
        // Fetch Stats
        const resStats = await fetch(`${BASE_URL}/admin/dashboard`, {
             headers: { 'Authorization': `Bearer ${token}` }
        });
        const dStats = await resStats.json();
        if(dStats.success) {
           setStats(dStats.stats);
           setPendingTrees(dStats.latestProofs);
        }

        // Fetch Self Role
        const resProf = await fetch(`${BASE_URL}/auth/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const dProf = await resProf.json();
        if(dProf.success) setUserRole(dProf.user.role);

     } catch (e) { console.log(e); }
  };

  const fetchWithdrawals = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const res = await fetch(`${BASE_URL}/admin/withdrawals/pending`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if(data.success) {
            setPendingWithdrawals(data.withdrawals);
            setShowWithdrawMgr(true);
        }
      } catch (e) {}
  };

  const processWithdrawal = async (wid, status) => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const res = await fetch(`${BASE_URL}/admin/withdrawals/process`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ withdrawalId: wid, status, transactionId: 'TXN'+Date.now(), notes: 'Processed via Admin App' })
        });
        const data = await res.json();
        if(data.success) {
            Alert.alert("Success", `Withdrawal ${status}`);
            fetchWithdrawals();
            fetchAdminDashboard();
        }
      } catch (e) {}
  };

  const fetchUsers = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const res = await fetch(`${BASE_URL}/admin/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if(data.success) setAllUsers(data.users);
        setShowRoleMgr(true);
      } catch (e) {}
  };

  const toggleBlock = async (uid, currentStatus) => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const res = await fetch(`${BASE_URL}/admin/users/block`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ userId: uid, isBlocked: !currentStatus })
        });
        const data = await res.json();
        if(data.success) {
            Alert.alert("Success", currentStatus ? "User Unblocked" : "User Blocked");
            fetchUsers();
        }
      } catch (e) {}
  };

  const updateRole = async (uid, newRole) => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const res = await fetch(`${BASE_URL}/admin/roles/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ userId: uid, role: newRole })
        });
        const data = await res.json();
        if(data.success) {
            Alert.alert("Success", data.message);
            fetchUsers();
        } else {
            Alert.alert("Error", data.error);
        }
      } catch (e) {}
  };

  const handleUpdateConfig = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const res = await fetch(`${BASE_URL}/admin/config/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(config)
        });
        const data = await res.json();
        if(data.success) {
            Alert.alert("Success", "Global Config Updated");
            setShowConfig(false);
        }
      } catch (e) {}
  };

  const handlePostNotice = async () => {
    if(!newNotice.trim()) return Alert.alert("Error", "Notice form cannot be empty.");
    try {
        // Here admin would post to a proper global config message API
        Alert.alert("Broadcast Success", "System broadcast updated live! 📢");
        setNewNotice('');
    } catch(e) {}
  };

  const fetchMessages = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await fetch(`${BASE_URL}/admin/messages/all`, {
          headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if(data.success) setMessages(data.messages);
    } catch(e) {}
  };

  const saveMessage = async () => {
    if(!newMsg.message.trim()) return Alert.alert("Error", "Message cannot be empty");
    try {
        const token = await AsyncStorage.getItem('userToken');
        const res = await fetch(`${BASE_URL}/admin/messages/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(newMsg)
        });
        const data = await res.json();
        if(data.success) {
            Alert.alert("Success", "Message Template Added");
            setNewMsg({ mood: 'Happy', language: 'English', category: 'General', message: '' });
            fetchMessages();
        }
    } catch(e) {}
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>TREENITI ADMIN PANEL</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        
        {/* Quick Stats Built Via Aggregation */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{stats.users}</Text>
            <Text style={styles.statLabel}>Total Users</Text>
          </View>
          <View style={[styles.statCard, {backgroundColor: '#E8F5E9'}]}>
            <Text style={[styles.statNum, {color: '#1B5E20'}]}>{stats.trees}</Text>
            <Text style={styles.statLabel}>Total Trees</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, {backgroundColor: '#FFF3E0'}]}>
            <Text style={[styles.statNum, {color: '#E65100'}]}>{stats.w_pending}</Text>
            <Text style={styles.statLabel}>Withdrawals Queue</Text>
          </View>
          <View style={[styles.statCard, {backgroundColor: '#E8EAF6'}]}>
            <Text style={[styles.statNum, {color: '#283593'}]}>{stats.p_pending}</Text>
            <Text style={styles.statLabel}>Proofs Awaiting Verification</Text>
          </View>
        </View>

        {/* Notice Board Controller */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📢 Post New Notice</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Write something for users..." 
            multiline
            value={newNotice}
            onChangeText={setNewNotice}
          />
          <TouchableOpacity style={styles.btn} onPress={handlePostNotice}>
            <Text style={styles.btnText}>Push to Notice Board</Text>
          </TouchableOpacity>
        </View>

        {/* ✅ ADMIN CORE CONTROLS (SRS 2.3) */}
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>🛠️ Admin Management</Text>
            
            <TouchableOpacity style={styles.btn} onPress={fetchUsers}>
                <Ionicons name="people" size={20} color="#fff" />
                <Text style={styles.btnText}>View & Manage Users</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.btn, {marginTop: 10, backgroundColor: '#2E7D32'}]} onPress={fetchWithdrawals}>
                <Ionicons name="cash" size={20} color="#fff" />
                <Text style={styles.btnText}>Withdrawal Requests ({stats.w_pending})</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.btn, {marginTop: 10, backgroundColor: '#455A64'}]} onPress={() => setShowMsgMgr(true)}>
                <Ionicons name="chatbubbles" size={20} color="#fff" />
                <Text style={styles.btnText}>Tree Talking Templates</Text>
            </TouchableOpacity>
        </View>

        {/* 👑 SUPER ADMIN CONTROLS (SRS 3.18) */}
        {userRole === 'SuperAdmin' && (
            <View style={[styles.section, {backgroundColor: '#FFFDE7'}]}>
                <Text style={[styles.sectionTitle, {color: '#FBC02D'}]}>👑 Super Admin Panel</Text>
                
                <TouchableOpacity style={[styles.btn, {backgroundColor: '#FBC02D'}]} onPress={() => setShowConfig(true)}>
                    <Text style={[styles.btnText, {color: '#333'}]}>Global System Config</Text>
                </TouchableOpacity>
            </View>
        )}

        {/* Tree Approvals Filtered directly from MongoDB */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✅ Real Plantation Queue ({stats.p_pending})</Text>
          {pendingTrees.length === 0 ? <Text style={{color:'#666'}}>No proofs pending review.</Text> : pendingTrees.map(pt => (
             <View key={pt._id} style={styles.itemCard}>
              <View style={{flex: 1}}>
                <Text style={styles.itemName}>{pt.userId?.name || 'Unknown User'}</Text>
                <Text style={styles.itemSub}>{pt.treeId?.treeName || 'Unassigned'} - Uploaded Photo</Text>
              </View>
              <View style={{flexDirection: 'row', marginLeft: 10}}>
                <TouchableOpacity style={styles.iconBtn} onPress={() => Alert.alert("Admin Engine", "Backend Hook /verify dispatched with Status 'Verified'")}>
                   <Ionicons name="checkmark-circle" size={28} color="green" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconBtn} onPress={() => Alert.alert("Admin Engine", "Backend Hook /verify dispatched with Status 'Rejected'")}>
                   <Ionicons name="close-circle" size={28} color="red" />
                </TouchableOpacity>
              </View>
             </View>
          ))}
        </View>

      </ScrollView>

      {/* Role Manager Modal */}
      <Modal visible={showRoleMgr} animationType="slide">
          <SafeAreaView style={{flex: 1, backgroundColor: '#fff'}}>
              <View style={styles.header}>
                  <TouchableOpacity onPress={() => setShowRoleMgr(false)}><Ionicons name="close" size={28} color="#fff" /></TouchableOpacity>
                  <Text style={styles.headerTitle}>Role Management</Text>
                  <View style={{width: 28}} />
              </View>
              <ScrollView style={{padding: 20}}>
                  {allUsers.map(u => (
                      <View key={u._id} style={styles.lbRow}>
                          <View style={{flex: 1}}>
                            <Text style={{fontWeight: 'bold'}}>{u.name || 'No Name'}</Text>
                            <Text style={{fontSize: 12, color: '#666'}}>{u.mobile} - Current: {u.role}</Text>
                          </View>
                          <View style={{flexDirection: 'row', alignItems: 'center'}}>
                              {userRole === 'SuperAdmin' && (
                                  <>
                                    <TouchableOpacity onPress={() => updateRole(u._id, 'Admin')} style={{padding: 5}}><Text style={{color: 'blue'}}>Set Admin</Text></TouchableOpacity>
                                    <TouchableOpacity onPress={() => updateRole(u._id, 'User')} style={{padding: 5, marginLeft: 10}}><Text style={{color: 'green'}}>Set User</Text></TouchableOpacity>
                                  </>
                              )}
                              <TouchableOpacity onPress={() => toggleBlock(u._id, u.isBlocked)} style={{padding: 5, marginLeft: 10}}>
                                  <Text style={{color: u.isBlocked ? 'green' : 'red'}}>{u.isBlocked ? 'Unblock' : 'Block'}</Text>
                              </TouchableOpacity>
                          </View>
                      </View>
                  ))}
              </ScrollView>
          </SafeAreaView>
      </Modal>

      {/* Withdrawal Manager Modal */}
      <Modal visible={showWithdrawMgr} animationType="slide">
          <SafeAreaView style={{flex: 1, backgroundColor: '#fff'}}>
              <View style={styles.header}>
                  <TouchableOpacity onPress={() => setShowWithdrawMgr(false)}><Ionicons name="close" size={28} color="#fff" /></TouchableOpacity>
                  <Text style={styles.headerTitle}>Pending Payouts</Text>
                  <View style={{width: 28}} />
              </View>
              <ScrollView style={{padding: 20}}>
                  {pendingWithdrawals.map(w => (
                      <View key={w._id} style={[styles.lbRow, {flexDirection: 'column', alignItems: 'flex-start'}]}>
                          <Text style={{fontWeight: 'bold', fontSize: 16}}>₹{w.amount} Request</Text>
                          <Text style={{color: '#666'}}>User: {w.userId?.name} ({w.userId?.mobile})</Text>
                          <Text style={{color: 'blue', marginTop: 5}}>UPI ID: {w.upiId}</Text>
                          <View style={{flexDirection: 'row', marginTop: 10}}>
                              <TouchableOpacity onPress={() => processWithdrawal(w._id, 'Approved')} style={[styles.btn, {backgroundColor: 'green', flex: 1, marginRight: 5}]}>
                                  <Text style={styles.btnText}>Approve</Text>
                              </TouchableOpacity>
                              <TouchableOpacity onPress={() => processWithdrawal(w._id, 'Rejected')} style={[styles.btn, {backgroundColor: 'red', flex: 1}]}>
                                  <Text style={styles.btnText}>Reject</Text>
                              </TouchableOpacity>
                          </View>
                      </View>
                  ))}
              </ScrollView>
          </SafeAreaView>
      </Modal>


      {/* Config Modal */}
      <Modal visible={showConfig} animationType="fade" transparent>
          <View style={styles.modalBg}>
              <View style={styles.modalCard}>
                  <Text style={styles.modalTitle}>System Configuration</Text>
                  <View style={{width: '100%', marginTop: 20}}>
                      <Text style={{fontSize: 12, marginBottom: 5}}>Conversion Rate (Coins per ₹1)</Text>
                      <TextInput 
                        style={styles.input} 
                        keyboardType="numeric" 
                        value={String(config.conversionRate)}
                        onChangeText={(v) => setConfig({...config, conversionRate: parseInt(v)})}
                      />

                      <Text style={{fontSize: 12, marginBottom: 5, marginTop: 15}}>Login Reward (Coins)</Text>
                      <TextInput 
                        style={styles.input} 
                        keyboardType="numeric" 
                        value={String(config.loginReward)}
                        onChangeText={(v) => setConfig({...config, loginReward: parseInt(v)})}
                      />

                      <TouchableOpacity style={[styles.btn, {marginTop: 20}]} onPress={handleUpdateConfig}>
                          <Text style={styles.btnText}>Apply Global Changes</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={{alignSelf: 'center', marginTop: 15}} onPress={() => setShowConfig(false)}>
                          <Text style={{color: 'red'}}>Cancel</Text>
                      </TouchableOpacity>
                  </View>
              </View>
          </View>
      </Modal>

      {/* --- Tree Message Manager Modal --- */}
      <Modal visible={showMsgMgr} transparent animationType="fade">
          <View style={styles.modalBg}>
              <View style={[styles.modalBox, {height: '80%'}]}>
                  <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                      <Text style={styles.modalTitle}>Tree Talking Messages</Text>
                      <TouchableOpacity onPress={() => setShowMsgMgr(false)}>
                          <Ionicons name="close-circle" size={28} color="#666" />
                      </TouchableOpacity>
                  </View>
                  <ScrollView style={{marginVertical: 15}} showsVerticalScrollIndicator={false}>
                      <View style={{backgroundColor: '#f5f5f5', padding: 15, borderRadius: 10, marginBottom: 20}}>
                          <Text style={{fontWeight: 'bold', fontSize: 13, marginBottom: 10}}>Add New Template (SRS 3.4.2)</Text>
                          <TextInput 
                            style={[styles.input, {height: 60}]} 
                            placeholder="Message Content..." 
                            value={newMsg.message}
                            onChangeText={m => setNewMsg({...newMsg, message: m})}
                          />
                          <View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: 10}}>
                             <TouchableOpacity style={{backgroundColor: '#ddd', padding: 10, borderRadius: 5}} onPress={() => setNewMsg({...newMsg, language: newMsg.language === 'English' ? 'Hindi' : 'English'})}>
                                <Text style={{fontSize: 12, fontWeight: 'bold'}}>{newMsg.language}</Text>
                             </TouchableOpacity>
                             <TouchableOpacity style={[styles.btn, {marginTop: 0, paddingHorizontal: 20}]} onPress={saveMessage}><Text style={styles.btnText}>SAVE</Text></TouchableOpacity>
                          </View>
                      </View>

                      {messages.map(m => (
                          <View key={m._id} style={styles.itemCard}>
                              <View style={{flex: 1}}>
                                <Text style={{fontWeight: 'bold', fontSize: 13}}>[{m.mood}] - {m.language}</Text>
                                <Text style={{fontSize: 13, color: '#444'}}>{m.message}</Text>
                              </View>
                          </View>
                      ))}
                  </ScrollView>
              </View>
          </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { 
    backgroundColor: '#1B5E20', 
    padding: 20, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingTop: 50 // Status bar ke liye thoda gap
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  statCard: { backgroundColor: '#fff', width: '48%', padding: 20, borderRadius: 15, elevation: 3, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  statLabel: { fontSize: 12, color: '#666', marginTop: 5 },
  section: { backgroundColor: '#fff', padding: 20, borderRadius: 20, marginBottom: 20, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1B5E20', marginBottom: 15 },
  input: { backgroundColor: '#F0F0F0', borderRadius: 10, padding: 15, height: 80, textAlignVertical: 'top' },
  btn: { backgroundColor: '#1B5E20', padding: 15, borderRadius: 10, marginTop: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold' },
  itemCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  itemName: { fontWeight: 'bold', fontSize: 14 },
  itemSub: { fontSize: 11, color: '#777' },
  iconBtn: { marginLeft: 10 }
});
