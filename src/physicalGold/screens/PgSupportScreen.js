import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  Alert,
  RefreshControl,
} from "react-native";
import { useSelector } from "react-redux";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { selectUserId, selectUserEmail } from "../../store/authSlice";
import PgLayout from "../components/PgLayout";
import FadeSlideIn from "../components/FadeSlideIn";
import PgLoader from "../components/PgLoader";
import {
  writeQuery,
  getAllQueries,
  cancelQuery,
  uploadQueryScreenshot,
} from "../api/physicalGoldApi";

const C = {
  bg: "#FFFFFF",
  card: "#FFFFFF",
  gold: "#0E6B57",
  goldLight: "#F7F4ED",
  goldTint: "rgba(14,107,87,0.08)",
  navy: "#1C1C1E",
  navyMid: "#48484C",
  navyLight: "#7A7A80",
  border: "#E7E0DA",
  divider: "#EEEBE8",
  danger: "#C0392B",
  dangerTint: "rgba(192,57,43,0.08)",
  warn: "#B8860B",
  warnTint: "rgba(184,134,11,0.10)",
};

const STATUS_TABS = [
  { key: "PENDING", label: "Pending" },
  { key: "COMPLETED", label: "Completed" },
  { key: "CANCELLED", label: "Cancelled" },
];

const STATUS_STYLE = {
  PENDING: { bg: C.warnTint, color: C.warn, icon: "time-outline" },
  COMPLETED: { bg: C.goldTint, color: C.gold, icon: "checkmark-circle-outline" },
  CANCELLED: { bg: C.dangerTint, color: C.danger, icon: "close-circle-outline" },
};

const formatDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const TicketCard = ({ item, onCancel, cancelling }) => {
  const statusStyle = STATUS_STYLE[item.queryStatus] || STATUS_STYLE.PENDING;
  return (
    <View style={styles.ticketCard}>
      <View style={styles.ticketHead}>
        <Text style={styles.ticketId} numberOfLines={1}>
          #{item.randomTicketId || item.ticketId || item.id}
        </Text>
        <View style={[styles.statusPill, { backgroundColor: statusStyle.bg }]}>
          <Ionicons name={statusStyle.icon} size={12} color={statusStyle.color} />
          <Text style={[styles.statusPillText, { color: statusStyle.color }]}>
            {item.queryStatus}
          </Text>
        </View>
      </View>

      <Text style={styles.ticketQuery}>{item.query}</Text>

      {!!item.createdAt && <Text style={styles.ticketDate}>{formatDate(item.createdAt)}</Text>}

      {Array.isArray(item.userDocuments) && item.userDocuments.length > 0 && (
        <View style={styles.attachRow}>
          <Ionicons name="attach-outline" size={14} color={C.navyLight} />
          <Text style={styles.attachText} numberOfLines={1}>
            {item.userDocuments.map((d) => d.fileName).join(", ")}
          </Text>
        </View>
      )}

      {!!item.comments && (
        <View style={styles.replyBox}>
          <Text style={styles.replyLabel}>
            Response{item.resolvedBy ? ` · ${item.resolvedBy}` : ""}
          </Text>
          <Text style={styles.replyText}>{item.comments}</Text>
        </View>
      )}

      {item.queryStatus === "PENDING" && (
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => onCancel(item)}
          disabled={cancelling}
        >
          {cancelling ? (
            <ActivityIndicator size="small" color={C.danger} />
          ) : (
            <>
              <Ionicons name="close-outline" size={14} color={C.danger} />
              <Text style={styles.cancelBtnText}>Cancel Ticket</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

const PgSupportScreen = ({ navigation }) => {
  const userId = useSelector(selectUserId);
  const userEmail = useSelector(selectUserEmail);

  const [activeStatus, setActiveStatus] = useState("PENDING");
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [queryText, setQueryText] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadTickets = useCallback(
    async (status, { silent } = {}) => {
      if (!userId) return;
      if (!silent) setLoading(true);
      try {
        const list = await getAllQueries({ userId, queryStatus: status });
        setTickets(Array.isArray(list) ? list : []);
      } catch (error) {
        console.error("[PgSupport] getAllQueries failed:", error.message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [userId]
  );

  useFocusEffect(
    useCallback(() => {
      loadTickets(activeStatus);
    }, [loadTickets, activeStatus])
  );

  const handleTabPress = (status) => {
    setActiveStatus(status);
    setLoading(true);
    loadTickets(status);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadTickets(activeStatus, { silent: true });
  };

  const handlePickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Please allow photo library access to attach a screenshot.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      setAttachment({
        uri: asset.uri,
        name: asset.fileName || `screenshot_${Date.now()}.jpg`,
        type: asset.mimeType || "image/jpeg",
      });
    }
  };

  const handleSubmit = async () => {
    if (!queryText.trim()) {
      Alert.alert("Query required", "Please describe your issue before submitting.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await writeQuery({ userId, query: queryText.trim(), email: userEmail });

      if (attachment && res?.ticketId) {
        try {
          await uploadQueryScreenshot(userId, res.ticketId, attachment);
        } catch (uploadErr) {
          console.error("[PgSupport] screenshot upload failed:", uploadErr.message);
        }
      }

      setQueryText("");
      setAttachment(null);
      setShowForm(false);
      Alert.alert(
        "Query Submitted",
        `Your ticket ${res?.randomTicketId ? `#${res.randomTicketId} ` : ""}has been created. Our team will get back to you soon.`
      );
      setActiveStatus("PENDING");
      loadTickets("PENDING");
    } catch (error) {
      Alert.alert("Submission failed", error.message || "Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = (item) => {
    Alert.alert("Cancel Ticket", "Are you sure you want to cancel this ticket?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Cancel",
        style: "destructive",
        onPress: async () => {
          setCancellingId(item.id);
          try {
            await cancelQuery(item.id, userId);
            loadTickets(activeStatus, { silent: true });
          } catch (error) {
            Alert.alert("Failed", error.message || "Could not cancel ticket.");
          } finally {
            setCancellingId(null);
          }
        },
      },
    ]);
  };

  return (
    <PgLayout title="Contact Support" showBack onBack={() => navigation.goBack()} hideLogo hideCart>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.gold} />}
      >
        <FadeSlideIn>
          <Text style={styles.mainTitle}>Help & Support</Text>
          <Text style={styles.subtitle}>
            Raise a ticket for any issue and track its status here.
          </Text>

          {!showForm ? (
            <TouchableOpacity style={styles.newQueryBtn} onPress={() => setShowForm(true)} activeOpacity={0.85}>
              <Ionicons name="add-circle-outline" size={15} color="#fff" />
              <Text style={styles.newQueryBtnText}>Raise a New Query</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.formCard}>
              <Text style={styles.formLabel}>Describe your issue</Text>
              <TextInput
                style={styles.formInput}
                value={queryText}
                onChangeText={setQueryText}
                placeholder="Tell us what went wrong..."
                placeholderTextColor={C.navyLight}
                multiline
                textAlignVertical="top"
              />

              <TouchableOpacity style={styles.attachBtn} onPress={handlePickImage}>
                <Ionicons name="image-outline" size={16} color={C.gold} />
                <Text style={styles.attachBtnText}>
                  {attachment ? "Change screenshot" : "Attach a screenshot (optional)"}
                </Text>
              </TouchableOpacity>

              {attachment && (
                <View style={styles.previewRow}>
                  <Image source={{ uri: attachment.uri }} style={styles.previewImg} />
                  <TouchableOpacity onPress={() => setAttachment(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={20} color={C.navyLight} />
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.formActions}>
                <TouchableOpacity
                  style={styles.formCancelBtn}
                  onPress={() => {
                    setShowForm(false);
                    setQueryText("");
                    setAttachment(null);
                  }}
                  disabled={submitting}
                >
                  <Text style={styles.formCancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.formSubmitBtn} onPress={handleSubmit} disabled={submitting}>
                  {submitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.formSubmitBtnText}>Submit</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.tabsRow}>
            {STATUS_TABS.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, activeStatus === tab.key && styles.tabActive]}
                onPress={() => handleTabPress(tab.key)}
              >
                <Text style={[styles.tabText, activeStatus === tab.key && styles.tabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {loading ? (
            <PgLoader />
          ) : tickets.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="headset-outline" size={32} color={C.navyLight} />
              <Text style={styles.emptyText}>No {activeStatus.toLowerCase()} tickets</Text>
            </View>
          ) : (
            tickets.map((item) => (
              <TicketCard
                key={String(item.id)}
                item={item}
                onCancel={handleCancel}
                cancelling={cancellingId === item.id}
              />
            ))
          )}

          <View style={styles.helpBox}>
            <Text style={styles.helpTitle}>Prefer to reach us directly?</Text>
            <Text style={styles.helpLine}><Text style={styles.helpLabel}>Email: </Text>support@askoxy.ai</Text>
            <Text style={styles.helpLine}><Text style={styles.helpLabel}>Phone: </Text>+91 81432 71103</Text>
          </View>
        </FadeSlideIn>
      </ScrollView>
    </PgLayout>
  );
};

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },
  mainTitle: { fontSize: 18, fontWeight: "900", color: C.navy, letterSpacing: -0.3, marginBottom: 4 },
  subtitle: { fontSize: 13, color: C.navyLight, marginBottom: 16, lineHeight: 19 },

  newQueryBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    alignSelf: "flex-start",
    backgroundColor: C.gold, borderRadius: 9, paddingVertical: 8, paddingHorizontal: 14, marginBottom: 18,
  },
  newQueryBtnText: { color: "#fff", fontSize: 12.5, fontWeight: "800" },

  formCard: {
    backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border,
    padding: 16, marginBottom: 18,
  },
  formLabel: { fontSize: 12.5, fontWeight: "700", color: C.navy, marginBottom: 8 },
  formInput: {
    borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12,
    fontSize: 13, color: C.navy, minHeight: 90, marginBottom: 12,
  },
  attachBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  attachBtnText: { fontSize: 12.5, color: C.gold, fontWeight: "700" },
  previewRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  previewImg: { width: 56, height: 56, borderRadius: 8, backgroundColor: C.divider },
  formActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  formCancelBtn: {
    flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 10,
    borderWidth: 1, borderColor: C.border,
  },
  formCancelBtnText: { fontSize: 13, fontWeight: "700", color: C.navyMid },
  formSubmitBtn: {
    flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 10,
    backgroundColor: C.gold,
  },
  formSubmitBtnText: { fontSize: 13, fontWeight: "800", color: "#fff" },

  tabsRow: {
    flexDirection: "row", backgroundColor: C.goldLight, borderRadius: 10, padding: 3, marginBottom: 14,
  },
  tab: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 8 },
  tabActive: { backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  tabText: { fontSize: 12, fontWeight: "700", color: C.navyLight },
  tabTextActive: { color: C.navy },

  emptyBox: { alignItems: "center", justifyContent: "center", paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: 13, color: C.navyLight, fontWeight: "600" },

  ticketCard: {
    backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border,
    padding: 14, marginBottom: 10,
  },
  ticketHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8, gap: 8 },
  ticketId: { fontSize: 12.5, fontWeight: "800", color: C.navy, flex: 1 },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  statusPillText: { fontSize: 10, fontWeight: "800" },
  ticketQuery: { fontSize: 13, color: C.navyMid, lineHeight: 19, marginBottom: 6, fontWeight: "500" },
  ticketDate: { fontSize: 11, color: C.navyLight, marginBottom: 4 },
  attachRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  attachText: { fontSize: 11.5, color: C.navyLight, flex: 1 },
  replyBox: { marginTop: 10, padding: 10, backgroundColor: C.goldTint, borderRadius: 8 },
  replyLabel: { fontSize: 10.5, fontWeight: "800", color: C.gold, marginBottom: 4 },
  replyText: { fontSize: 12.5, color: C.navyMid, lineHeight: 18 },
  cancelBtn: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", marginTop: 10 },
  cancelBtnText: { fontSize: 12, fontWeight: "700", color: C.danger },

  helpBox: {
    marginTop: 10, padding: 18, backgroundColor: C.goldLight, borderRadius: 14,
    borderWidth: 1, borderColor: C.border,
  },
  helpTitle: { fontSize: 14, fontWeight: "800", color: C.navy, marginBottom: 8 },
  helpLine: { fontSize: 13, color: C.navyMid, lineHeight: 21 },
  helpLabel: { fontWeight: "800", color: C.navy },
});

export default PgSupportScreen;
