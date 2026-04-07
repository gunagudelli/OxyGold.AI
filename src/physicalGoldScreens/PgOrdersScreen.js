import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import { selectAccessToken, selectUserId } from "../store/authSlice";
import { getUserOrders } from "./physicalGoldApi";
import PgLayout from "../../components/physical/PgLayout";
import { downloadInvoicePDF, openInvoicePDF } from "../utils/downloadInvoice";

const C = {
  bg: "#F7F5F0",
  surface: "#FFFFFF",
  border: "#E8E3D8",
  gold: "#B8891A",
  goldLight: "#D4A82A",
  goldDim: "rgba(184,137,26,0.10)",
  goldDimBorder: "rgba(184,137,26,0.22)",
  textPri: "#1A1508",
  textSec: "#6B6050",
  textTer: "#A89880",
  success: "#1A7A4A",
  successBg: "#EDFBF3",
  warning: "#D97706",
  warningBg: "#FFFBEB",
};

const getStatusColor = (status) => {
  const upperStatus = status?.toUpperCase();
  switch (upperStatus) {
    case "CONFIRMED":
    case "DELIVERED":
      return { bg: C.successBg, color: C.success, icon: "checkmark-circle" };
    case "PENDING":
    case "PROCESSING":
      return { bg: C.warningBg, color: C.warning, icon: "time" };
    case "CANCELLED":
      return { bg: "#FEF2F2", color: "#C0392B", icon: "close-circle" };
    default:
      return { bg: "#F0EEE9", color: C.textTer, icon: "help-circle" };
  }
};

const OrderCard = ({ order, onViewInvoice, onDownloadInvoice }) => {
  const statusInfo = getStatusColor(order.orderStatus);
  const orderDate = new Date(
    order.paymentExpiry || order.createdAt || order.orderDate,
  ).toLocaleDateString("en-IN");
  const itemCount = order.items?.length || order.totalItems || 1;

  const orderNumber = order.orderNumber || order.orderId || "";
  const displayOrderId = orderNumber.toString().slice(-6);

  return (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.orderId}>Order #{displayOrderId}</Text>
          <Text style={styles.orderDate}>{orderDate}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
          <Ionicons name={statusInfo.icon} size={12} color={statusInfo.color} />
          <Text
            style={[styles.statusText, { color: statusInfo.color }]}
            numberOfLines={1}
          >
            {order.orderStatus || "Unknown"}
          </Text>
        </View>
      </View>

      <View style={styles.orderBody}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemCount}>
            {itemCount} item{itemCount > 1 ? "s" : ""}
          </Text>
          <Text style={styles.itemDesc} numberOfLines={1}>
            {order.items?.[0]?.productName || "Gold Product"}
            {itemCount > 1 ? ` +${itemCount - 1}` : ""}
          </Text>
        </View>
        <View style={styles.amountInfo}>
          <Text style={styles.amountLabel}>Total</Text>
          <Text style={styles.amount}>
            ₹{Number(order.totalAmount || 0).toLocaleString("en-IN")}
          </Text>
        </View>
      </View>

      {/* Invoice Actions */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.invoiceBtn}
          onPress={() => onViewInvoice(orderNumber)}
        >
          <Ionicons name="eye-outline" size={16} color={C.gold} />
          <Text style={styles.invoiceBtnText}>View Invoice</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.invoiceBtn}
          onPress={() => onDownloadInvoice(orderNumber)}
        >
          <Ionicons name="download-outline" size={16} color={C.gold} />
          <Text style={styles.invoiceBtnText}>Download</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const PgOrdersScreen = ({ navigation, route }) => {
  const reduxAccessToken = useSelector(selectAccessToken);
  const reduxUserId = useSelector(selectUserId);
  const routeUserId = route?.params?.userId;
  const userId = routeUserId || reduxUserId;

  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [downloadingOrder, setDownloadingOrder] = useState(null);

  useEffect(() => {
    console.log(
      "[Orders] Redux Token:",
      reduxAccessToken ? "present" : "missing",
    );
    console.log("[Orders] Redux UserId:", reduxUserId);
  }, [reduxAccessToken, reduxUserId]);

  useEffect(() => {
    if (userId) {
      fetchOrders();
    }
  }, [userId]);

  const fetchOrders = async () => {
    if (!userId) return;
    const startTime = Date.now();
    try {
      setLoading(true);
      console.log("[Orders Fetch] userId:", userId);
      const orders = await getUserOrders(userId);
      console.log("[Orders Response]", orders);
      setOrders(orders);
    } catch (error) {
      console.error("[Orders Error]", error.message);
      Alert.alert("Error", "Failed to load orders");
    } finally {
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, 2000 - elapsedTime);
      setTimeout(() => {
        setLoading(false);
      }, remainingTime);
    }
  };

  const handleViewInvoice = (orderNumber) => {
    console.log("[Orders] View invoice for order:", orderNumber);
    navigation.navigate("PgInvoiceViewer", { orderNumber });
  };

  const handleDownloadInvoice = async (orderNumber) => {
    console.log("[Orders] Download invoice for order:", orderNumber);

    if (!reduxAccessToken) {
      Alert.alert("Error", "Session expired. Please login again.");
      return;
    }

    setDownloadingOrder(orderNumber);

    try {
      const fileUri = await downloadInvoicePDF(orderNumber, reduxAccessToken);

      Alert.alert("Success", "Invoice downloaded successfully", [
        {
          text: "Open",
          onPress: async () => {
            try {
              await openInvoicePDF(fileUri);
            } catch (e) {
              Alert.alert("Error", e.message);
            }
          },
        },
        { text: "Close" },
      ]);
    } catch (error) {
      console.error("[Orders Download Error]", error.message);
      Alert.alert("Download Failed", error.message);
    } finally {
      setDownloadingOrder(null);
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (filter === "all") return true;
    return order.orderStatus?.toUpperCase() === filter.toUpperCase();
  });

  if (loading) {
    return (
      <PgLayout
        title="My Orders"
        showBack={true}
        onBack={() => navigation.goBack()}
        hideLogo={true}
      >
        <View style={[styles.root, styles.center]}>
          <ActivityIndicator size="large" color={C.gold} />
        </View>
      </PgLayout>
    );
  }

  if (orders.length === 0) {
    return (
      <PgLayout
        title="My Orders"
        showBack={true}
        onBack={() => navigation.goBack()}
        hideLogo={true}
      >
        <View style={[styles.root, styles.center]}>
          <Ionicons name="receipt-outline" size={64} color={C.textTer} />
          <Text style={styles.emptyText}>No orders yet</Text>
          <TouchableOpacity
            style={styles.shopBtn}
            onPress={() => navigation.navigate("PgHome")}
          >
            <Text style={styles.shopBtnText}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      </PgLayout>
    );
  }

  return (
    <PgLayout
      title="My Orders"
      showBack={true}
      onBack={() => navigation.goBack()}
      hideLogo={true}
    >
      <View style={styles.root}>
        {/* Filter Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContent}
        >
          {[
            "all",
            "PENDING",
            "PROCESSING",
            "CONFIRMED",
            "DELIVERED",
            "CANCELLED",
          ].map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterTab, filter === f && styles.filterTabActive]}
              onPress={() => setFilter(f)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  filter === f && styles.filterTabTextActive,
                ]}
              >
                {f === "all" ? "All" : f}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Orders List */}
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => (item.orderId || item.id)?.toString()}
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              onViewInvoice={handleViewInvoice}
              onDownloadInvoice={handleDownloadInvoice}
            />
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyFilterText}>
                No {filter} orders found
              </Text>
            </View>
          }
        />
      </View>
    </PgLayout>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { justifyContent: "center", alignItems: "center" },

  /* FILTER */
  filterScroll: {
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },

  filterContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },

  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: "#F3F1EC",
    borderWidth: 1,
    borderColor: C.border,
  },

  filterTabActive: {
    backgroundColor: C.gold,
    borderColor: C.gold,
  },

  filterTabText: {
    fontSize: 11,
    fontWeight: "600",
    color: C.textSec,
  },

  filterTabTextActive: {
    color: "#fff",
  },

  /* LIST */
  listContent: {
    padding: 14,
    paddingBottom: 24,
  },

  /* ORDER CARD */
  orderCard: {
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
  },

  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  orderId: {
    fontSize: 14,
    fontWeight: "800",
    color: C.textPri,
  },

  orderDate: {
    fontSize: 11,
    color: C.textTer,
    marginTop: 2,
  },

  /* STATUS BADGE */
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    minWidth: 90,
    justifyContent: "center",
  },

  statusText: {
    fontSize: 10,
    fontWeight: "700",
  },

  /* BODY */
  orderBody: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F1EC",
  },

  itemInfo: {
    flex: 1,
  },

  itemCount: {
    fontSize: 12,
    fontWeight: "700",
    color: C.textPri,
  },

  itemDesc: {
    fontSize: 11,
    color: C.textTer,
    marginTop: 2,
  },

  amountInfo: {
    alignItems: "flex-end",
  },

  amountLabel: {
    fontSize: 9,
    color: C.textTer,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontWeight: "600",
  },

  amount: {
    fontSize: 15,
    fontWeight: "900",
    color: C.gold,
    marginTop: 2,
  },

  /* INVOICE ACTIONS */
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },

  invoiceBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: C.goldDim,
    borderRadius: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: C.goldDimBorder,
  },

  invoiceBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: C.gold,
  },

  /* EMPTY */
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },

  emptyText: {
    fontSize: 14,
    color: C.textSec,
    marginTop: 12,
    marginBottom: 20,
  },

  emptyFilterText: {
    fontSize: 13,
    color: C.textTer,
  },

  shopBtn: {
    backgroundColor: C.gold,
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },

  shopBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },
});

export default PgOrdersScreen;
