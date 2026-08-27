import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  FlatList,
} from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { selectUserId } from '../../store/authSlice';
import { getWalletBalance, getWalletTransactions } from './physicalGoldApi';
import PgLayout from '../components/PgLayout';

const C = {
  bg: '#F8F7F6',
  card: '#FFFFFF',
  gold: '#CF8B17',
  navy: '#1C1C1E',
  navyLight: '#7A7A80',
  green: '#2ECC71',
  greenBg: '#E8F5E9',
  red: '#C85A54',
  redBg: '#FDECEA',
  border: '#E7E0DA',
  divider: '#EEEBE8',
  textMuted: '#A79C93',
};

const FILTERS = ['ALL', 'CREDIT', 'DEBIT'];

const PgWalletScreen = ({ navigation }) => {
  const userId = useSelector(selectUserId);

  const [state, setState] = useState({
    balance: 0,
    transactions: [],
    isLoading: false,
    isRefreshing: false,
    error: null,
    filter: 'ALL',
  });

  const patch = useCallback(
    (partial) => setState((prev) => ({ ...prev, ...partial })),
    [],
  );

  const fetchWalletData = useCallback(async () => {
    if (!userId) return;

    const startTime = Date.now();
    patch({ isLoading: true, error: null });

    try {
      const [balRes, txRes] = await Promise.all([
        getWalletBalance(userId),
        getWalletTransactions(userId),
      ]);

      // Ensure 2-second minimum loader
      const elapsed = Date.now() - startTime;
      if (elapsed < 2000) {
        await new Promise((resolve) => setTimeout(resolve, 2000 - elapsed));
      }

      patch({
        balance: balRes?.balance || 0,
        transactions: txRes || [],
      });
    } catch (err) {
      console.error('[Wallet] Fetch failed:', err);
      patch({ error: err.message || 'Failed to load wallet' });
    } finally {
      patch({ isLoading: false, isRefreshing: false });
    }
  }, [userId, patch]);

  useEffect(() => {
    fetchWalletData();
  }, [userId]);

  const handleRefresh = () => {
    patch({ isRefreshing: true });
    fetchWalletData();
  };

  const formatINR = (amount) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  const getFilteredTransactions = () => {
    if (state.filter === 'ALL') return state.transactions;
    if (state.filter === 'CREDIT') return state.transactions.filter((tx) => tx.type === 'LOAD');
    if (state.filter === 'DEBIT') return state.transactions.filter((tx) => tx.type !== 'LOAD');
    return state.transactions;
  };

  const isCredit = (tx) => tx.type === 'LOAD';
  const filteredTransactions = getFilteredTransactions();

  return (
    <PgLayout title="My Wallet" showBack onBack={() => navigation.goBack()}>
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={state.isRefreshing}
            onRefresh={handleRefresh}
            tintColor={C.navy}
          />
        }
      >
        {/* ── Balance Card ── */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeaderRow}>
            <View style={styles.balanceIconWrap}>
              <Ionicons name="wallet" size={16} color="#fff" />
            </View>
            <Text style={styles.balanceLabel}>Available Balance</Text>
          </View>

          <Text style={styles.balanceValue}>
            {state.isLoading ? '···' : formatINR(state.balance)}
          </Text>

          <View style={styles.balanceFooterRow}>
            <Text style={styles.balanceFooterText}>OxyGold Secure Wallet</Text>
            <View style={styles.balanceCheckBadge}>
              <Ionicons name="checkmark" size={14} color={C.green} />
            </View>
          </View>
        </View>

        {/* ── Filter Tabs ── */}
        <View style={styles.filterRow}>
          {FILTERS.map((filter) => {
            const active = state.filter === filter;
            return (
              <TouchableOpacity
                key={filter}
                onPress={() => patch({ filter })}
                style={[styles.filterChip, active && styles.filterChipActive]}
                activeOpacity={0.75}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {filter}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Transactions ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>Recent Activity</Text>
            <View style={styles.sectionCountRow}>
              <Ionicons name="time-outline" size={12} color={C.navyLight} />
              <Text style={styles.sectionCountText}>{filteredTransactions.length}</Text>
            </View>
          </View>

          {state.isLoading && state.transactions.length === 0 ? (
            <View style={styles.stateBox}>
              <ActivityIndicator size="large" color={C.navy} />
            </View>
          ) : filteredTransactions.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="time-outline" size={40} color={C.border} />
              <Text style={styles.emptyText}>No transactions found</Text>
            </View>
          ) : (
            <View style={styles.listCard}>
              <FlatList
                scrollEnabled={false}
                data={filteredTransactions}
                keyExtractor={(item) => item.transactionId?.toString()}
                renderItem={({ item: tx, index }) => {
                  const credit = isCredit(tx);
                  const isSuccess = tx.status === 'SUCCESS';

                  return (
                    <View
                      style={[
                        styles.txRow,
                        index !== filteredTransactions.length - 1 && styles.txRowDivider,
                      ]}
                    >
                      <View style={styles.txLeft}>
                        <View style={[styles.txIconWrap, credit ? styles.txIconWrapCredit : styles.txIconWrapDebit]}>
                          <Ionicons
                            name={credit ? 'arrow-up-outline' : 'arrow-down-outline'}
                            size={18}
                            color={credit ? C.green : C.red}
                          />
                        </View>
                        <View>
                          <Text style={styles.txTitle}>
                            {credit ? 'Added to Wallet' : 'Product Purchase'}
                          </Text>
                          <Text style={styles.txDate}>{formatDate(tx.createdAt)}</Text>
                        </View>
                      </View>

                      <View style={styles.txRight}>
                        <Text style={[styles.txAmount, credit && styles.txAmountCredit]}>
                          {credit ? '+' : '−'}{formatINR(tx.amount)}
                        </Text>
                        <View style={styles.txStatusRow}>
                          <View style={[styles.txStatusDot, { backgroundColor: isSuccess ? C.green : '#D4A574' }]} />
                          <Text style={styles.txStatusText}>{tx.status}</Text>
                        </View>
                      </View>
                    </View>
                  );
                }}
              />
            </View>
          )}
        </View>

        {state.error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{state.error}</Text>
          </View>
        )}
      </ScrollView>
    </PgLayout>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingBottom: 32 },

  // ── Balance Card ──
  balanceCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: C.navy,
    borderRadius: 20,
    padding: 20,
    shadowColor: 'rgba(28,20,14,0.25)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 4,
  },
  balanceHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  balanceIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  balanceValue: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  balanceFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  balanceFooterText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  balanceCheckBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(46,204,113,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Filter Tabs ──
  filterRow: { flexDirection: 'row', gap: 8, marginHorizontal: 16, marginTop: 20 },
  filterChip: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
  },
  filterChipActive: { backgroundColor: C.navy, borderColor: C.navy },
  filterChipText: {
    fontSize: 10,
    fontWeight: '800',
    color: C.navyLight,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  filterChipTextActive: { color: '#FFFFFF' },

  // ── Section ──
  section: { marginHorizontal: 16, marginTop: 22 },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: C.navyLight,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  sectionCountRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sectionCountText: { fontSize: 10, fontWeight: '800', color: C.textMuted },

  stateBox: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBox: {
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: C.border,
    backgroundColor: C.card,
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '700',
    color: C.textMuted,
  },

  // ── Transaction List ──
  listCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
    overflow: 'hidden',
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  txRowDivider: { borderBottomWidth: 1, borderBottomColor: C.divider },
  txLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  txIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txIconWrapCredit: { backgroundColor: C.greenBg },
  txIconWrapDebit: { backgroundColor: C.redBg },
  txTitle: { fontSize: 13, fontWeight: '700', color: C.navy },
  txDate: {
    fontSize: 10,
    fontWeight: '700',
    color: C.textMuted,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  txRight: { alignItems: 'flex-end' },
  txAmount: { fontSize: 14, fontWeight: '900', color: C.navy, letterSpacing: -0.2 },
  txAmountCredit: { color: C.green },
  txStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  txStatusDot: { width: 5, height: 5, borderRadius: 3 },
  txStatusText: {
    fontSize: 9,
    fontWeight: '800',
    color: C.textMuted,
    letterSpacing: 0.4,
  },

  // ── Error ──
  errorBox: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: C.redBg,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(200,90,84,0.25)',
  },
  errorText: { fontSize: 12, fontWeight: '700', color: C.red },
});

export default PgWalletScreen;
