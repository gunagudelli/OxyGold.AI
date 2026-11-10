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
  Image,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import { selectAccessToken, selectUserId } from "../../store/authSlice";
import { getUserOrders, getOrderDeliveryTracking } from "../api/physicalGoldApi";
import PgLayout from "../components/PgLayout";
import PgLoader from "../components/PgLoader";
import FadeSlideIn from "../components/FadeSlideIn";
import { downloadInvoicePDF, openInvoicePDF } from "../../utils/downloadInvoice";
import { resolveImageUrl } from "../utils/resolveImageUrl";
import { colors } from "../theme";

const C = {
  bg: "#FFFFFF",
  surface: "#FFFFFF",
  border: "#E0E0E0",
  gold: "#503189",
  goldLight: "#503189",
  goldDim: "rgba(80,49,137,0.10)",
  goldDimBorder: "rgba(80,49,137,0.22)",
  textPri: "#333333",
  textSec: "#757575",
  textTer: "#9E9E9E",
  success: "#1F8A4C",
  successBg: "#EAF8F1",
  warning: "#F59E0B",
  warningBg: "#FFF8E6",
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
      return { bg: "#FDECEA", color: "#E53935", icon: "close-circle" };
    default:
      return { bg: "#EEEEF3", color: C.textTer, icon: "help-circle" };
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
  const partnerName = deliveryBoy
    ? [deliveryBoy.firstName, deliveryBoy.lastName].filter(Boolean).join(" ")
    : "";
  const partnerPhone =
    deliveryBoy?.phoneNumber || deliveryBoy?.mobileNumber || deliveryBoy?.phone || null;
  const events = Array.isArray(timeline) ? timeline : [];

  const InfoRow = ({ icon, label, value, right }) => (
    <View style={styles.tkRow}>
      <View style={styles.tkRowIcon}>
        <Ionicons name={icon} size={15} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.tkRowLabel}>{label}</Text>
        <Text style={styles.tkRowValue} numberOfLines={2}>
          {value}
        </Text>
      </View>
      {right}
    </View>
  );

  return (
    <View style={styles.trackingPanel}>
      {/* Current status banner */}
      {statusLabel ? (
        <View style={styles.tkStatus}>
          <Ionicons name="bicycle-outline" size={18} color="#FFFFFF" />
          <Text style={styles.tkStatusText}>{statusLabel}</Text>
        </View>
      ) : null}

      {/* Details */}
      {(trackingNumber || partnerName || deliveryAddress) && (
        <View style={styles.tkInfo}>
          {trackingNumber ? (
            <InfoRow icon="barcode-outline" label="Tracking No." value={trackingNumber} />
          ) : null}
          {partnerName ? (
            <InfoRow
              icon="person-outline"
              label="Delivery partner"
              value={`${partnerName}${deliveryBoy?.vehicleNumber ? ` · ${deliveryBoy.vehicleNumber}` : ""}`}
              right={
                partnerPhone ? (
                  <TouchableOpacity
                    style={styles.tkCall}
                    onPress={() => Linking.openURL(`tel:${partnerPhone}`)}
                    accessibilityLabel="Call delivery partner"
                  >
                    <Ionicons name="call" size={14} color="#FFFFFF" />
                    <Text style={styles.tkCallText}>Call</Text>
                  </TouchableOpacity>
                ) : null
              }
            />
          ) : null}
          {deliveryAddress ? (
            <InfoRow icon="location-outline" label="Delivering to" value={deliveryAddress} />
          ) : null}
        </View>
      )}

      {/* Stepper — newest first: the top step is the current one */}
      {events.length > 0 && (
        <View style={styles.tkSteps}>
          {events.map((event, i) => {
            const current = i === 0;
            const last = i === events.length - 1;
            return (
              <View key={`${event.status}-${i}`} style={styles.tkStep}>
                <View style={styles.tkStepRail}>
                  <View style={[styles.tkStepDot, current ? styles.tkStepDotCurrent : styles.tkStepDotDone]}>
                    <Ionicons
                      name={current ? "ellipse" : "checkmark"}
                      size={current ? 8 : 12}
                      color="#FFFFFF"
                    />
                  </View>
                  {!last && <View style={styles.tkStepLine} />}
                </View>
                <View style={[styles.tkStepBody, last && { paddingBottom: 0 }]}>
                  <Text style={[styles.tkStepTitle, current && { color: colors.primary }]}>
                    {event.statusLabel || event.status}
                  </Text>
                  {event.description ? <Text style={styles.tkStepDesc}>{event.description}</Text> : null}
                  {event.timestamp ? (
                    <Text style={styles.tkStepTime}>
                      {new Date(event.timestamp).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })}
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

  const firstItem = order.items?.[0] || {};
  const imageUrl = resolveImageUrl(
    firstItem.imageUrl || firstItem.productImage || firstItem.frontViewurl || firstItem.image,
  );
  const statusText = String(order.orderStatus || "Unknown")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
  const placedOn = new Date(order.createdAt || order.orderDate || order.paymentExpiry);
  const placedText = Number.isNaN(placedOn.getTime())
    ? orderDate
    : placedOn.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <View style={styles.ocCard}>
      {/* Status + order no. */}
      <View style={styles.ocTop}>
        <View style={[styles.ocStatusPill, { backgroundColor: statusInfo.bg }]}>
          <Ionicons name={statusInfo.icon} size={13} color={statusInfo.color} />
          <Text style={[styles.ocStatusText, { color: statusInfo.color }]}>{statusText}</Text>
        </View>
        <Text style={styles.ocOrderNo}>#{displayOrderId}</Text>
      </View>

      {/* Product summary */}
      <TouchableOpacity
        style={styles.ocBody}
        onPress={() => onViewInvoice(orderNumber)}
        activeOpacity={0.75}
      >
        <View style={styles.ocImage}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={{ width: "100%", height: "100%" }} resizeMode="contain" />
          ) : (
            <Ionicons name="cube-outline" size={24} color={colors.primary} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.ocName} numberOfLines={2}>
            {firstItem.productName || "Gold Product"}
            {itemCount > 1 ? ` + ${itemCount - 1} more` : ""}
          </Text>
          <Text style={styles.ocMeta}>
            {itemCount} item{itemCount !== 1 ? "s" : ""} · Placed {placedText}
          </Text>
          <Text style={styles.ocAmount}>₹{Number(order.totalAmount || 0).toLocaleString("en-IN")}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textDisabled} />
      </TouchableOpacity>

      {/* Actions */}
      <View style={styles.ocActions}>
        <TouchableOpacity style={styles.ocAction} onPress={handleToggleTracking} activeOpacity={0.7}>
          <Ionicons name="navigate-outline" size={15} color={colors.primary} />
          <Text style={styles.ocActionText}>{showTracking ? "Hide tracking" : "Track order"}</Text>
        </TouchableOpacity>
        <View style={styles.ocActionDivider} />
        <TouchableOpacity style={styles.ocAction} onPress={() => onViewInvoice(orderNumber)} activeOpacity={0.7}>
          <Ionicons name="document-text-outline" size={15} color={colors.primary} />
          <Text style={styles.ocActionText}>Invoice</Text>
        </TouchableOpacity>
        <View style={styles.ocActionDivider} />
        <TouchableOpacity style={styles.ocAction} onPress={() => onDownloadInvoice(orderNumber)} activeOpacity={0.7}>
          <Ionicons name="download-outline" size={15} color={colors.primary} />
          <Text style={styles.ocActionText}>Download</Text>
        </TouchableOpacity>
      </View>

      {showTracking && (
        <View style={styles.ocTracking}>
          <TrackingTimeline tracking={tracking} loading={trackingLoading} />
        </View>
      )}
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
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  onPress={() => setFilter(item.key)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={item.icon}
                    size={14}
                    color={isActive ? "#FFFFFF" : C.textSec}
                  />
                  <Text
                    style={[styles.filterChipText, isActive && styles.filterChipTextActive]}
                  >
                    {item.label}
                  </Text>
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
  // Light grey page so the white order cards stand out (was all white).
  root: { flex: 1, backgroundColor: "#F4F3F8" },
  center: { justifyContent: "center", alignItems: "center" },

  /* FILTER - Modern Compact Design */
  filterContainer: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#ECEAF2",
  },

  filterContent: {
    paddingHorizontal: 14,
    gap: 8,
  },

  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DCD6E6",
  },

  // Selected filter: filled brand purple, white text.
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },

  filterChipText: { fontSize: 12.5, fontWeight: "500", color: C.textSec },

  filterChipTextActive: { fontWeight: "600", color: "#FFFFFF" },

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

  /* ORDER CARD — status pill, product summary with image, action bar */
  ocCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ECEAF2",
    shadowColor: "#2A1F4A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  ocTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  ocStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  ocStatusText: { fontSize: 12, fontWeight: "600" },
  ocOrderNo: { fontSize: 12, fontWeight: "500", color: colors.textSecondary },
  ocBody: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  ocImage: {
    width: 68,
    height: 68,
    borderRadius: 12,
    backgroundColor: "#F7F5FB",
    borderWidth: 1,
    borderColor: "#ECEAF2",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  ocName: { fontSize: 14, fontWeight: "600", color: colors.text, lineHeight: 19 },
  ocMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 3 },
  ocAmount: { fontSize: 16, fontWeight: "700", color: colors.text, marginTop: 6 },
  // Tinted action bar so the actions read as buttons.
  ocActions: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#ECEAF2",
    backgroundColor: "#FAF8FD",
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  ocAction: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
  },
  ocActionText: { fontSize: 13, fontWeight: "600", color: colors.primary },
  ocActionDivider: { width: 1, height: 20, backgroundColor: "#E4E0EC" },
  ocTracking: {
    paddingHorizontal: 14,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: "#ECEAF2",
  },

  /* TRACK ORDER — status banner, info box, stepper */
  tkStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginTop: 14,
  },
  tkStatusText: { fontSize: 14, fontWeight: "600", color: "#FFFFFF", flex: 1 },
  tkInfo: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ECEAF2",
    backgroundColor: "#FAF8FD",
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  tkRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9 },
  tkRowIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#EFE9FA",
    alignItems: "center",
    justifyContent: "center",
  },
  tkRowLabel: { fontSize: 11, color: colors.textMuted },
  tkRowValue: { fontSize: 13, fontWeight: "600", color: colors.text, marginTop: 1 },
  tkCall: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#1F8A4C",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  tkCallText: { fontSize: 12, fontWeight: "600", color: "#FFFFFF" },
  tkSteps: { marginTop: 16, paddingLeft: 2 },
  tkStep: { flexDirection: "row", gap: 12 },
  tkStepRail: { alignItems: "center", width: 22 },
  tkStepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  tkStepDotDone: { backgroundColor: "#1F8A4C" },
  tkStepDotCurrent: {
    backgroundColor: colors.primary,
    borderWidth: 4,
    borderColor: "#E4DAF7",
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  tkStepLine: { width: 2, flex: 1, backgroundColor: "#BFE3CB", marginVertical: 2 },
  tkStepBody: { flex: 1, paddingBottom: 18 },
  tkStepTitle: { fontSize: 13.5, fontWeight: "600", color: colors.text },
  tkStepDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 2, lineHeight: 16 },
  tkStepTime: { fontSize: 11, color: colors.textMuted, marginTop: 3 },

  /* ORDER CARD (previous layout) */
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
    fontWeight: "500",
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
    fontWeight: "500",
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
    borderBottomColor: "#EEEEF3",
  },

  itemInfo: {
    flex: 1,
  },

  itemCount: {
    fontSize: 12,
    fontWeight: "600",
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
    fontWeight: "500",
  },

  amount: {
    fontSize: 15,
    fontWeight: "600",
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
    fontWeight: "600",
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
    borderTopColor: "#EEEEF3",
  },
  trackToggleText: { fontSize: 12, fontWeight: "500", color: C.textSec },

  trackingLoading: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 18, justifyContent: "center" },
  trackingLoadingText: { fontSize: 12, color: C.textTer },

  trackingEmpty: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 18, justifyContent: "center" },
  trackingEmptyText: { fontSize: 12, color: C.textTer },

  trackingPanel: { paddingTop: 0 },
  trackingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingVertical: 5 },
  trackingLabel: { fontSize: 12, color: C.textTer, fontWeight: "500" },
  trackingValue: { fontSize: 13, color: C.textPri, fontWeight: "600" },

  timelineWrap: { marginTop: 10 },
  timelineItem: { flexDirection: "row", gap: 10 },
  timelineDotCol: { alignItems: "center", width: 12 },
  timelineDot: { width: 9, height: 9, borderRadius: 4.5, backgroundColor: C.border, marginTop: 3 },
  timelineDotActive: { backgroundColor: C.gold },
  timelineLine: { width: 1.5, flex: 1, backgroundColor: C.border, marginTop: 2 },
  timelineStatus: { fontSize: 13, fontWeight: "600", color: C.textPri },
  timelineDesc: { fontSize: 12, color: C.textSec, marginTop: 2, lineHeight: 16 },
  timelineTime: { fontSize: 11, color: C.textTer, marginTop: 3 },

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
    fontWeight: "600",
    color: "#fff",
  },
});

export default PgOrdersScreen;
