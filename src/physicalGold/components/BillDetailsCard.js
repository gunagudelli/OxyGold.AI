import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// "Bill details" card — shared by Cart and Checkout so both show the price
// breakdown with exactly the same look: icon + label rows, grand total and a
// savings pill.

const C = {
  text: "#333333",
  label: "#555555",
  muted: "#757575",
  free: "#1F8A4C",
  border: "#EEEEF3",
  divider: "#EEEEF3",
};

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const BillRow = ({ icon, label, sub, value, free, onPress }) => {
  const Wrap = onPress ? TouchableOpacity : View;
  return (
    <Wrap style={s.row} {...(onPress ? { onPress, activeOpacity: 0.7 } : {})}>
      <Ionicons name={icon} size={15} color={C.muted} style={s.icon} />
      <View style={{ flex: 1 }}>
        <View style={s.labelRow}>
          <Text style={s.label}>{label}</Text>
          {onPress && <Ionicons name="information-circle-outline" size={13} color={C.muted} />}
        </View>
        {!!sub && <Text style={s.sub}>{sub}</Text>}
      </View>
      <Text style={[s.value, free && s.valueFree]}>{value}</Text>
    </Wrap>
  );
};

const BillDetailsCard = ({
  itemCount = 0,
  subtotal = 0,
  making = 0,
  gst = 0,
  discount = 0, // backend discount (GST waiver when it covers the GST)
  deliveryFee = 0,
  deliveryDistanceKm = null,
  ratePerKm = null,
  couponCode,
  couponDiscount = 0,
  total = 0,
  onDiscountPress,
  style,
}) => {
  const savings = Number(discount || 0) + Number(couponDiscount || 0);
  return (
    <View style={[s.card, style]}>
      <Text style={s.title}>Bill details</Text>

      <BillRow icon="document-text-outline" label={`Items total (${itemCount})`} value={inr(subtotal)} />
      <BillRow
        icon="hammer-outline"
        label="Making charges"
        value={making > 0 ? inr(making) : "FREE"}
        free={making <= 0}
      />
      <BillRow icon="receipt-outline" label="GST (3%)" value={inr(gst)} />
      {discount > 0 && (
        <BillRow
          icon="pricetag-outline"
          label={discount >= gst - 1 ? "GST paid by OXYGOLD.AI" : "Discount"}
          value={`-${inr(discount)}`}
          free
          onPress={onDiscountPress}
        />
      )}
      {couponDiscount > 0 && (
        <BillRow
          icon="ticket-outline"
          label={`Coupon${couponCode ? ` (${couponCode})` : ""}`}
          value={`-${inr(couponDiscount)}`}
          free
        />
      )}
      <BillRow
        icon="bicycle-outline"
        label={`Delivery fee${Number(deliveryDistanceKm) > 0 ? ` · ${deliveryDistanceKm} km` : ""}`}
        sub={deliveryFee > 0 && ratePerKm !== null && deliveryDistanceKm !== null ? `₹${ratePerKm}/km` : null}
        value={deliveryFee > 0 ? inr(deliveryFee) : "FREE"}
        free={deliveryFee <= 0}
      />

      <View style={s.divider} />
      <View style={s.totalRow}>
        <Text style={s.totalLabel}>Grand total</Text>
        <Text style={s.totalValue}>{inr(total)}</Text>
      </View>

      {savings > 0 && (
        <View style={s.savings}>
          <Text style={s.savingsText}>🎉 You're saving {inr(savings)} on this order</Text>
        </View>
      )}
    </View>
  );
};

export default BillDetailsCard;

const s = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ECEAF2",
    shadowColor: "#2A1F4A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  title: { fontSize: 15, fontWeight: "600", color: C.text, marginBottom: 10 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 7 },
  icon: { width: 24 },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  label: { fontSize: 13, color: C.label },
  sub: { fontSize: 11, color: C.muted, marginTop: 1 },
  value: { fontSize: 13, fontWeight: "500", color: C.text },
  valueFree: { color: C.free },
  divider: { height: 1, backgroundColor: C.divider, marginVertical: 8 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4 },
  totalLabel: { fontSize: 15, fontWeight: "600", color: C.text },
  totalValue: { fontSize: 16, fontWeight: "600", color: C.text },
  savings: {
    marginTop: 12,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#EAF8F1",
    alignItems: "center",
  },
  savingsText: { fontSize: 13, fontWeight: "500", color: "#15803D" },
});
