import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  FlatList,
} from 'react-native';
import { useSelector } from 'react-redux';
import { ArrowUpRight, ArrowDownLeft, History, Wallet } from 'lucide-react-native';
import { getWalletBalance, getWalletTransactions } from './walletApi';

const PgWalletScreen = () => {
  const userId = useSelector((state) => state.auth?.userId);
  
  const [state, setState] = useState({
    balance: 0,
    transactions: [],
    isLoading: false,
    isRefreshing: false,
    error: null,
    filter: 'ALL', // ALL, CREDIT, DEBIT
  });

  const patch = useCallback(
    (partial) => setState((prev) => ({ ...prev, ...partial })),
    []
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

  const formatINR = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getFilteredTransactions = () => {
    if (state.filter === 'ALL') return state.transactions;
    if (state.filter === 'CREDIT') return state.transactions.filter((tx) => tx.type === 'LOAD');
    if (state.filter === 'DEBIT') return state.transactions.filter((tx) => tx.type !== 'LOAD');
    return state.transactions;
  };

  const isCredit = (tx) => tx.type === 'LOAD';
  const filteredTransactions = getFilteredTransactions();

  return (
    <View className="flex-1 bg-[#FBF8F3]">
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={state.isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#2b0a59"
          />
        }
      >
        {/* Balance Card */}
        <View className="mx-4 mt-4 rounded-3xl bg-[#2b0a59] p-6 shadow-lg">
          <View className="flex-row items-center gap-2 mb-4">
            <View className="h-8 w-8 items-center justify-center rounded-lg bg-white/10">
              <Wallet size={16} color="white" />
            </View>
            <Text className="text-[10px] font-black uppercase tracking-widest text-white/50">
              Available Balance
            </Text>
          </View>

          {state.isLoading ? (
            <Text className="text-4xl font-black text-white">...</Text>
          ) : (
            <Text className="text-4xl font-black text-white tracking-tight">
              {formatINR(state.balance)}
            </Text>
          )}

          <View className="mt-6 border-t border-white/10 pt-4 flex-row items-center justify-between">
            <Text className="text-[10px] font-bold uppercase tracking-widest text-white/40">
              OxyGold Secure Wallet
            </Text>
            <View className="h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20">
              <Text className="text-emerald-400 text-lg">✓</Text>
            </View>
          </View>
        </View>

        {/* Filter Tabs */}
        <View className="mx-4 mt-6 flex-row gap-2">
          {['ALL', 'CREDIT', 'DEBIT'].map((filter) => (
            <TouchableOpacity
              key={filter}
              onPress={() => patch({ filter })}
              className={`flex-1 rounded-xl py-2.5 ${
                state.filter === filter
                  ? 'bg-[#2b0a59]'
                  : 'bg-white border border-zinc-200'
              }`}
            >
              <Text
                className={`text-center text-[10px] font-black uppercase tracking-widest ${
                  state.filter === filter ? 'text-white' : 'text-zinc-400'
                }`}
              >
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Transactions Section */}
        <View className="mx-4 mt-6 mb-6">
          <View className="flex-row items-center justify-between mb-3 px-1">
            <Text className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
              Recent Activity
            </Text>
            <View className="flex-row items-center gap-1">
              <History size={12} color="#a1a1a1" />
              <Text className="text-[10px] font-black uppercase tracking-widest text-zinc-300">
                {filteredTransactions.length}
              </Text>
            </View>
          </View>

          {state.isLoading && state.transactions.length === 0 ? (
            <View className="rounded-2xl border border-zinc-200 bg-white py-12 items-center justify-center">
              <ActivityIndicator size="large" color="#2b0a59" />
            </View>
          ) : filteredTransactions.length === 0 ? (
            <View className="rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50 py-12 items-center justify-center">
              <History size={40} color="#d4d4d8" />
              <Text className="mt-3 text-[11px] font-bold uppercase tracking-tight text-zinc-300">
                No transactions found
              </Text>
            </View>
          ) : (
            <View className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
              <FlatList
                scrollEnabled={false}
                data={filteredTransactions}
                keyExtractor={(item) => item.transactionId?.toString()}
                renderItem={({ item: tx, index }) => {
                  const credit = isCredit(tx);
                  const isSuccess = tx.status === 'SUCCESS';
                  
                  return (
                    <View
                      className={`flex-row items-center justify-between px-4 py-3 ${
                        index !== filteredTransactions.length - 1
                          ? 'border-b border-zinc-100'
                          : ''
                      }`}
                    >
                      <View className="flex-row items-center gap-3 flex-1">
                        <View
                          className={`h-10 w-10 items-center justify-center rounded-lg ${
                            credit ? 'bg-emerald-50' : 'bg-rose-50'
                          }`}
                        >
                          {credit ? (
                            <ArrowUpRight size={20} color={credit ? '#10b981' : '#ef4444'} />
                          ) : (
                            <ArrowDownLeft size={20} color="#ef4444" />
                          )}
                        </View>
                        <View>
                          <Text className="text-[13px] font-bold text-zinc-900">
                            {credit ? 'Added to Wallet' : 'Product Purchase'}
                          </Text>
                          <Text className="text-[10px] font-bold uppercase tracking-tight text-zinc-400">
                            {formatDate(tx.createdAt)}
                          </Text>
                        </View>
                      </View>

                      <View className="items-end">
                        <Text
                          className={`text-sm font-black tracking-tight ${
                            credit ? 'text-emerald-600' : 'text-zinc-900'
                          }`}
                        >
                          {credit ? '+' : '−'}{formatINR(tx.amount)}
                        </Text>
                        <View className="flex-row items-center gap-1 mt-0.5">
                          <View
                            className={`h-1 w-1 rounded-full ${
                              isSuccess ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                          />
                          <Text className="text-[9px] font-black uppercase tracking-tighter text-zinc-300">
                            {tx.status}
                          </Text>
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
          <View className="mx-4 mb-4 rounded-xl bg-rose-50 p-3 border border-rose-200">
            <Text className="text-[12px] font-bold text-rose-600">{state.error}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default PgWalletScreen;
