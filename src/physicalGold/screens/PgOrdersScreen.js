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
import { selectAccessToken, selectUserId } from "../../store/authSlice";
import { getUserOrders, getOrderDeliveryTracking } from "../api/physicalGoldApi";
import PgLayout from "../components/PgLayout";
import PgLoader from "../components/PgLoader";
import FadeSlideIn from "../components/FadeSlideIn";
import { downloadInvoicePDF, openInvoicePDF } from "../../utils/downloadInvoice";

const C = {
  bg: "#FFFFFF",
  surface: "#FFFFFF",
  border: "#E7E0DA",
  gold: "#0E6B57",
  goldLight: "#0E6B57",
  goldDim: "rgba(14,107,87,0.10)",
  goldDimBorder: "rgba(14,107,87,0.22)",
  textPri: "#1C1C1E",
  textSec: "#7A7A80",
  textTer: "#A79C93",
  success: "#1F8A4C",
  successBg: "#E8F5E9",
  warning: "#D4A574",
  warningBg: "#FDF6ED",
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
      return { bg: "#FDECEA", color: "#C85A54", icon: "close-circle" };
    default:
      return { bg: "#EEEBE8", color: C.textTer, icon: "help-circle" };
  }
};

const TrackingTimeline = ({ tracking, loading }) => {
  if (loading) {
    return (
      <View style={styles.trackingLoading}>
        <ActivityIndicator size="small" color={C.gold} />
        <Text style={styles.trackingLoadingText}>Fetching tracking info...</Text>
      </View>
    );
  }

  if (!tracking) {
    return (
      <View style={styles.trackingEmpty}>
        <Ionicons name="cube-outline" size={18} color={C.textTer} />
        <Text style={styles.trackingEmptyText}>Tracking isn't available for this order yet</Text>
      </View>
    );
  }

  const { trackingNumber, statusLabel, deliveryBoy, deliveryAddress, timeline } = tracking;

  return (
    <View style={styles.trackingPanel}>
      {trackingNumber ? (
        <View style={styles.trackingRow}>
          <Text style={styles.trackingLabel}>Tracking No.</Text>
          <Text style={styles.trackingValue}>{trackingNumber}</Text>
        </View>
      ) : null}

      {statusLabel ? (
        <View style={styles.trackingRow}>
          <Text style={styles.trackingLabel}>Status</Text>
          <Text style={styles.trackingValue}>{statusLabel}</Text>
        </View>
      ) : null}

      {deliveryBoy ? (
        <View style={styles.trackingRow}>
          <Text style={styles.trackingLabel}>Delivery Partner</Text>
          <Text style={styles.trackingValue}>
            {[deliveryBoy.firstName, deliveryBoy.lastName].filter(Boolean).join(" ")}
            {deliveryBoy.vehicleNumber ? ` · ${deliveryBoy.vehicleNumber}` : ""}
          </Text>
        </View>
      ) : null}

      {deliveryAddress ? (
        <View style={styles.trackingRow}>
          <Text style={styles.trackingLabel}>Delivering To</Text>
          <Text style={[styles.trackingValue, { flex: 1, textAlign: "right" }]} numberOfLines={2}>
            {deliveryAddress}
          </Text>
        </View>
      ) : null}

      {Array.isArray(timeline) && timeline.length > 0 && (
        <View style={styles.timelineWrap}>
          {timeline.map((event, i) => (
            <View key={`${event.status}-${i}`} style={styles.timelineItem}>
              <View style={styles.timelineDotCol}>
                <View style={[styles.timelineDot, i === 0 && styles.timelineDotActive]} />
                {i < timeline.length - 1 && <View style={styles.timelineLine} />}
              </View>
              <View style={{ flex: 1, paddingBottom: 14 }}>
                <Text style={styles.timelineStatus}>{event.statusLabel || event.status}</Text>
                {event.description ? (
                  <Text style={styles.timelineDesc}>{event.description}</Text>
                ) : null}
                {event.timestamp ? (
                  <Text style={styles.timelineTime}>
                    {new Date(event.timestamp).toLocaleString("en-IN")}
                  </Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const OrderCard = ({ order, userId, onViewInvoice, onDownloadInvoice }) => {
  const statusInfo = getStatusColor(order.orderStatus);
  const orderDate = new Date(
    order.paymentExpiry || order.createdAt || order.orderDate,
  ).toLocaleDateString("en-IN");
  const itemCount = order.items?.length || order.totalItems || 1;

  const orderNumber = order.orderNumber || order.orderId || "";
  const displayOrderId = orderNumber.toString().slice(-6);

  const [showTracking, setShowTracking] = useState(false);
  const [tracking, setTracking] = useState(undefined); // undefined = not fetched yet
  const [trackingLoading, setTrackingLoading] = useState(false);

  const handleToggleTracking = async () => {
    const next = !showTracking;
    setShowTracking(next);
    if (next && tracking === undefined) {
      setTrackingLoading(true);
      try {
        const data = await getOrderDeliveryTracking(order.orderId || order.id, userId);
        setTracking(data || null);
      } catch (e) {
        setTracking(null);
      } finally {
        setTrackingLoading(false);
      }
    }
  };

  return (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View style={{ flex: 1 }}>
          <View style={styles.orderTopRow}>
            <Text style={styles.orderId}>Order #{displayOrderId}</Text>
            <View style={[styles.statusDot, { backgroundColor: statusInfo.color }]} />
          </View>
          <Text style={styles.orderDate}>{orderDate}</Text>
        </View>
      </View>

      <View style={styles.orderBody}>
        <View style={styles.itemInfo}>
          <View style={styles.statusRow}>
            <Ionicons name={statusInfo.icon} size={11} color={statusInfo.color} />
            <Text style={[styles.statusLabel, { color: statusInfo.color }]}>
              {order.orderStatus || "Unknown"}
            </Text>
          </View>
          <Text style={styles.itemCount}>
            {itemCount} item{itemCount !== 1 ? "s" : ""}
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

      <TouchableOpacity style={styles.trackToggle} onPress={handleToggleTracking} activeOpacity={0.75}>
        <Ionicons name="navigate-outline" size={14} color={C.textSec} />
        <Text style={styles.trackToggleText}>{showTracking ? "Hide Tracking" : "Track Order"}</Text>
        <Ionicons name={showTracking ? "chevron-up" : "chevron-down"} size={14} color={C.textTer} />
      </TouchableOpacity>

      {showTracking && <TrackingTimeline tracking={tracking} loading={trackingLoading} />}
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
      const remainingTime = Math.max(0, 800 - elapsedTime);
      setTimeout(() => {
        setLoading(false);
      }, remainingTime);
    }
  };

  const handleViewInvoice = (orderNumber) => {
    console.log("[Orders] View invoice for order:", orderNumber);
    const order = orders.find(o => (o.orderNumber || o.orderId) === orderNumber);
    if (order) {
      navigation.navigate("PgInvoiceDetails", { order });
    } else {
      Alert.alert("Error", "Order not found");
    }
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
        <PgLoader label="Loading orders..." />
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
        {/* Filter Tabs - Modern Compact Design */}
        <View style={styles.filterContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterContent}
          >
            {[
              { key: "all", label: "All", icon: "apps" },
              { key: "PENDING", label: "Pending", icon: "time-outline" },
              { key: "PROCESSING", label: "Processing", icon: "sync-outline" },
              { key: "CONFIRMED", label: "Confirmed", icon: "checkmark-circle-outline" },
              { key: "DELIVERED", label: "Delivered", icon: "checkmark-done-circle-outline" },
              { key: "CANCELLED", label: "Cancelled", icon: "close-circle-outline" },
            ].map((item) => {
              const isActive = filter === item.key;
              const statusInfo = getStatusColor(item.key);
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.filterChip,
                    isActive && styles.filterChipActive,
                    isActive && { borderColor: statusInfo.color },
                  ]}
                  onPress={() => setFilter(item.key)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={item.icon}
                    size={14}
                    color={isActive ? statusInfo.color : C.textTer}
                  />
                  <Text
                    style={[
                      styles.filterChipText,
                      isActive && styles.filterChipTextActive,
                      isActive && { color: statusInfo.color },
                    ]}
                  >
                    {item.label}
                  </Text>
                  {isActive && <View style={[styles.filterDot, { backgroundColor: statusInfo.color }]} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Orders List */}
        <FadeSlideIn style={{ flex: 1 }}>
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => (item.orderId || item.id)?.toString()}
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              userId={userId}
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
        </FadeSlideIn>
      </View>
    </PgLayout>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { justifyContent: "center", alignItems: "center" },

  /* FILTER - Modern Compact Design */
  filterContainer: {
    backgroundColor: C.surface,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },

  filterContent: {
    paddingHorizontal: 14,
    gap: 8,
  },

  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#EEEBE8",
    borderWidth: 1.5,
    borderColor: "transparent",
  },

  filterChipActive: {
    backgroundColor: C.surface,
    borderWidth: 1.5,
    shadowColor: "rgba(0,0,0,0.08)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },

  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: C.textTer,
  },

  filterChipTextActive: {
    fontWeight: "600",
  },

  filterDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
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
    alignItems: "flex-start",
    marginBottom: 10,
  },

  orderTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  orderId: {
    fontSize: 14,
    fontWeight: "600",
    color: C.textPri,
  },

  orderDate: {
    fontSize: 11,
    color: C.textTer,
    marginTop: 2,
  },

  /* STATUS */
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },

  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 4,
  },

  statusLabel: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  /* BODY */
  orderBody: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEBE8",
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
    fontWeight: "700",
    color: C.textPri,
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
    color: C.textPri,
  },

  /* TRACKING */
  trackToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#EEEBE8",
  },
  trackToggleText: { fontSize: 12, fontWeight: "600", color: C.textSec },

  trackingLoading: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 14, justifyContent: "center" },
  trackingLoadingText: { fontSize: 12, color: C.textTer },

  trackingEmpty: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 14, justifyContent: "center" },
  trackingEmptyText: { fontSize: 12, color: C.textTer },

  trackingPanel: { marginTop: 10, paddingTop: 4 },
  trackingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingVertical: 5 },
  trackingLabel: { fontSize: 11.5, color: C.textTer, fontWeight: "600" },
  trackingValue: { fontSize: 12.5, color: C.textPri, fontWeight: "700" },

  timelineWrap: { marginTop: 10 },
  timelineItem: { flexDirection: "row", gap: 10 },
  timelineDotCol: { alignItems: "center", width: 12 },
  timelineDot: { width: 9, height: 9, borderRadius: 4.5, backgroundColor: C.border, marginTop: 3 },
  timelineDotActive: { backgroundColor: C.gold },
  timelineLine: { width: 1.5, flex: 1, backgroundColor: C.border, marginTop: 2 },
  timelineStatus: { fontSize: 12.5, fontWeight: "700", color: C.textPri },
  timelineDesc: { fontSize: 11.5, color: C.textSec, marginTop: 2, lineHeight: 16 },
  timelineTime: { fontSize: 10.5, color: C.textTer, marginTop: 3 },

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
