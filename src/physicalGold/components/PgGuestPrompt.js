import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import GuestLoginSheet from "./GuestLoginSheet";

// Shown on login-only screens (Wishlist, Cart) when the user is a guest.
// Opens the half-screen OTP login; once logged in, userId changes in the
// store and the screen loads its data by itself.
const PgGuestPrompt = ({ icon = "person-circle-outline", title, subtitle }) => {
  const [showSheet, setShowSheet] = useState(false);
  return (
    <View style={s.wrap}>
      <View style={s.iconCircle}>
        <Ionicons name={icon} size={44} color="#503189" />
      </View>
      <Text style={s.title}>{title}</Text>
      {!!subtitle && <Text style={s.subtitle}>{subtitle}</Text>}
      <TouchableOpacity style={s.btn} onPress={() => setShowSheet(true)} activeOpacity={0.85}>
        <Text style={s.btnText}>Login</Text>
      </TouchableOpacity>
      <GuestLoginSheet
        visible={showSheet}
        onClose={() => setShowSheet(false)}
        onSuccess={() => setShowSheet(false)}
      />
    </View>
  );
};

const s = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  iconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "#F4F0FA",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: { fontSize: 18, fontWeight: "600", color: "#333333", marginBottom: 6, textAlign: "center" },
  subtitle: { fontSize: 13, color: "#757575", textAlign: "center", lineHeight: 19, marginBottom: 22 },
  btn: { backgroundColor: "#503189", borderRadius: 24, paddingHorizontal: 48, paddingVertical: 12 },
  btnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
});

export default PgGuestPrompt;
