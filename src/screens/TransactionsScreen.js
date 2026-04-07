import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Platform,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useSelector } from "react-redux";
import { selectUserId } from "../store/authSlice";
import { fetchTransactions } from "../services/goldApi";

const C = {
  bg: "#F7F6F3",
  card: "#FFFFFF",
  gold: "#C8952A",
  goldLight: "#F5ECD7",
  navy: "#1C2340",
  navyLight: "#8891AF",
  green: "#0E9F6E",
  greenBg: "#ECFDF5",
  red: "#E02424",
  redBg: "#FEF2F2",
  border: "#EAE8E2",
  divider: "#F0EEE9",
};

const TransactionsScreen = ({ navigation }) => {
  const userId = useSelector(selectUserId);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const loadTransactions = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await fetchTransactions(userId);
      setTransactions(data || []);
    } catch (error) {
      console.log("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      loadTransactions();
    }, [loadTransactions])
  );

  const filteredTransactions =
    filter === "all"
      ? transactions
      : transactions.filter((t) => t.type === (filter === "buy" ? "BUY" : "SELL"));

  const totalAmount = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
  const totalGrams = filteredTransactions.reduce((sum, t) => sum + t.grams, 0);

  const renderTransaction = ({ item, index }) => {
    const isBuy = item.type === "BUY";
    const date = new Date(item.timestamp);
    const formattedDate = date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const formattedTime = date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });

    return (
      <View
        style={[
          s.txnItem,
          index < filteredTransactions.length - 1 && s.txnItemBorder,
        ]}
      >
        <View style={[s.txnDot, isBuy ? s.txnDotBuy : s.txnDotSell]}>
          <Text style={s.txnDotText}>{isBuy ? "↑" : "↓"}</Text>
        </View>
        <View style={s.txnContent}>
          <Text style={s.txnTitle}>
            {isBuy ? "Bought Gold" : "Sold Gold"}
          </Text>
          <Text style={s.txnDate}>
            {formattedDate} at {formattedTime}
          </Text>
        </View>
        <View style={s.txnRight}>
          <Text style={s.txnAmount}>
            ₹{item.amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </Text>
          <Text style={s.txnGrams}>{item.grams.toFixed(4)} g</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      <View style={s.header}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={s.backBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>All Transactions</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
      >
        <View style={s.statsCard}>
          <View style={s.statItem}>
            <Text style={s.statLabel}>Total Amount</Text>
            <Text style={s.statValue}>
              ₹{totalAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={s.statLabel}>Total Grams</Text>
            <Text style={s.statValue}>{totalGrams.toFixed(4)} g</Text>
          </View>
        </View>

        <View style={s.filterTabs}>
          {[
            { key: "all", label: "All" },
            { key: "buy", label: "Bought" },
            { key: "sell", label: "Sold" },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setFilter(tab.key)}
              style={[s.filterTab, filter === tab.key && s.filterTabActive]}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  s.filterTabText,
                  filter === tab.key && s.filterTabTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={s.loadingBox}>
            <ActivityIndicator color={C.gold} size="large" />
            <Text style={s.loadingText}>Loading transactions...</Text>
          </View>
        ) : filteredTransactions.length === 0 ? (
          <View style={s.emptyBox}>
            <Text style={s.emptyIcon}>📭</Text>
            <Text style={s.emptyTitle}>No Transactions</Text>
            <Text style={s.emptySub}>
              {filter === "all"
                ? "You haven't made any transactions yet"
                : `No ${filter === "buy" ? "buy" : "sell"} transactions`}
            </Text>
          </View>
        ) : (
          <View style={s.txnList}>
            <FlatList
              data={filteredTransactions}
              renderItem={renderTransaction}
              keyExtractor={(item) =>
                item.id?.toString() || Math.random().toString()
              }
              scrollEnabled={false}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 10 : 14,
    paddingBottom: 14,
    backgroundColor: C.bg,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.card,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: "rgba(28,35,64,0.08)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  backBtnText: {
    fontSize: 28,
    lineHeight: 32,
    color: C.navy,
    fontWeight: "300",
    marginTop: -2,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: C.navy,
    letterSpacing: 0.2,
  },
  scroll: { paddingBottom: 40 },
  statsCard: {
    flexDirection: "row",
    backgroundColor: C.card,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 20,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: "rgba(28,35,64,0.08)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  statItem: { flex: 1, alignItems: "center" },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: C.navyLight,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "800",
    color: C.gold,
    letterSpacing: -0.3,
  },
  statDivider: {
    width: 1,
    height: 50,
    backgroundColor: C.divider,
    marginHorizontal: 16,
  },
  filterTabs: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 20,
    gap: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
  },
  filterTabActive: {
    backgroundColor: C.goldLight,
    borderColor: C.gold,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: "600",
    color: C.navyLight,
  },
  filterTabTextActive: {
    color: C.gold,
    fontWeight: "700",
  },
  loadingBox: {
    alignItems: "center",
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 14,
    color: C.navyLight,
    marginTop: 16,
  },
  emptyBox: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: C.navy,
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    color: C.navyLight,
    textAlign: "center",
  },
  txnList: {
    backgroundColor: C.card,
    marginHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
    shadowColor: "rgba(28,35,64,0.08)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  txnItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  txnItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: C.divider,
  },
  txnDot: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  txnDotBuy: { backgroundColor: C.greenBg },
  txnDotSell: { backgroundColor: C.redBg },
  txnDotText: {
    fontSize: 18,
    fontWeight: "700",
    color: C.gold,
  },
  txnContent: { flex: 1 },
  txnTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: C.navy,
    marginBottom: 3,
  },
  txnDate: {
    fontSize: 12,
    color: C.navyLight,
  },
  txnRight: { alignItems: "flex-end" },
  txnAmount: {
    fontSize: 14,
    fontWeight: "700",
    color: C.navy,
    marginBottom: 3,
  },
  txnGrams: {
    fontSize: 12,
    color: C.gold,
    fontWeight: "500",
  },
});

export default TransactionsScreen;
