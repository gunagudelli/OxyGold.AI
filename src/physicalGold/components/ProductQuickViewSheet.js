import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getProductVariants, getProductImages, getVariantPriceBreakup } from "../api/physicalGoldApi";
import { resolveImageUrl } from "../utils/resolveImageUrl";

// ─── Product quick view (Home) ──────────────────────────────────────────────
// Bottom sheet opened by tapping a product card on Home: image, name, weight
// options, price, GST note and Buy Now — without leaving Home. "View Full
// Details" still goes to the full Product Details screen.
const C = {
  navy: "#1A1A1A",
  grey: "#6B6B6B",
  line: "#EEEEEE",
  gold: "#B8860B",
  violet: "#7C3AED",
  green: "#047857",
  accent: "#C0267E",
};
const fmt = (n) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const ProductQuickViewSheet = ({ visible, product, onClose, onBuyNow, buyingNow, onViewFull }) => {
  const [loading, setLoading] = useState(false);
  const [variants, setVariants] = useState([]);
  const [selected, setSelected] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [description, setDescription] = useState("");
  const [breakup, setBreakup] = useState(null);

  const name = product?.productName || product?.name || "Product";
  const isSilver = [name, product?.categoryName, selected?.purity].some((v) => /silver/i.test(String(v || "")));
  const metalColor = isSilver ? C.violet : C.gold;

  // Load variants + image whenever a new product is opened.
  useEffect(() => {
    if (!visible || !product?.id) return;
    let alive = true;
    setLoading(true);
    setVariants([]);
    setSelected(null);
    setBreakup(null);
    setDescription(product?.description || "");
    setImageUrl(resolveImageUrl(product?.imageUrl || product?.image) || null);

    // Search/Home products carry mrp on their embedded variants; the
    // variants endpoint often doesn't, so backfill from there.
    const navVariants = product?.variants || [];
    getProductVariants(product.id)
      .then((res) => {
        if (!alive) return;
        const inner = res?.data || res;
        const list = inner?.listVariantResponse || inner?.variants || (Array.isArray(inner) ? inner : []);
        const prod = inner?.productResponse || inner?.product;
        if (prod?.description) setDescription(prod.description);
        const mapped = list.map((v) => {
          const nav = navVariants.find((nv) => String(nv.id) === String(v.id)) || navVariants[0];
          return {
            id: v.id,
            price: Number(v.price) || 0,
            mrp: Number(v.mrp || nav?.mrp) || 0,
            weight: v.weight || v.weightInGrams || 0,
            purity: v.purity || "",
            stockQuantity: v.stockQuantity ?? null,
          };
        });
        setVariants(mapped);
        setSelected(mapped[0] || null);
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));

    if (!product?.imageUrl && !product?.image) {
      getProductImages(product.id)
        .then((imgs) => alive && setImageUrl(imgs?.frontViewUrl || imgs?.imageUrl || null))
        .catch(() => {});
    }
    return () => { alive = false; };
  }, [visible, product?.id]);

  // Price breakup for the selected weight — tells us whether GST is waived.
  useEffect(() => {
    if (!selected?.id) return;
    let alive = true;
    setBreakup(null);
    getVariantPriceBreakup(selected.id)
      .then((d) => alive && setBreakup(d || null))
      .catch(() => {});
    return () => { alive = false; };
  }, [selected?.id]);

  const price = selected?.price || 0;
  const mrp = selected?.mrp || 0;
  const offPct = mrp > price && price > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const gstWaived = Number(breakup?.discountAmount) > 0;
  const outOfStock = selected?.stockQuantity === 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />

        <View style={s.sheet}>
          <View style={s.handle} />
          <TouchableOpacity style={s.close} onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={20} color={C.navy} />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
            {/* Image */}
            <View style={s.imageBox}>
              {imageUrl ? (
                <Image source={{ uri: imageUrl }} style={s.image} resizeMode="contain" />
              ) : (
                <Ionicons name="image-outline" size={40} color="#CCCCCC" />
              )}
              {offPct > 0 && (
                <View style={s.offBadge}>
                  <Text style={s.offBadgeText}>{offPct}% OFF</Text>
                </View>
              )}
            </View>

            {/* Name + purity */}
            <Text style={s.name}>{name}</Text>
            {!!selected?.purity && (
              <Text style={[s.purity, { color: metalColor }]}>{selected.purity}</Text>
            )}

            {loading ? (
              <ActivityIndicator style={{ marginVertical: 24 }} color={metalColor} />
            ) : (
              <>
                {/* Price */}
                <View style={s.priceRow}>
                  <Text style={s.price}>₹{fmt(price)}</Text>
                  {offPct > 0 && <Text style={s.mrp}>₹{fmt(mrp)}</Text>}
                </View>
                {gstWaived && (
                  <View style={s.gstTag}>
                    <Ionicons name="checkmark-circle" size={14} color={C.green} />
                    <Text style={s.gstTagText}>GST FREE · Paid by OXYGOLD.AI</Text>
                  </View>
                )}

                {/* Weight options */}
                {variants.length > 1 && (
                  <>
                    <Text style={s.sectionLabel}>Select Weight</Text>
                    <View style={s.chips}>
                      {variants.map((v) => {
                        const active = String(v.id) === String(selected?.id);
                        return (
                          <TouchableOpacity
                            key={v.id}
                            onPress={() => setSelected(v)}
                            activeOpacity={0.8}
                            style={[s.chip, active && { borderColor: metalColor, backgroundColor: `${metalColor}12` }]}
                          >
                            <Text style={[s.chipText, active && { color: metalColor, fontWeight: "800" }]}>
                              {v.weight}g
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                )}
                {variants.length === 1 && !!selected?.weight && (
                  <Text style={s.weightOnly}>Weight: {selected.weight}g</Text>
                )}

                {/* Description */}
                {!!description && (
                  <Text style={s.desc} numberOfLines={3}>{description}</Text>
                )}
              </>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={s.footer}>
            <TouchableOpacity
              style={s.detailsBtn}
              onPress={() => onViewFull?.(product)}
              activeOpacity={0.8}
            >
              <Text style={s.detailsBtnText}>View Full Details</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.buyBtn, (!selected || outOfStock || buyingNow) && s.buyBtnDisabled]}
              disabled={!selected || outOfStock || buyingNow}
              onPress={() => onBuyNow?.(product, { id: selected.id, weight: selected.weight })}
              activeOpacity={0.85}
            >
              {buyingNow ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={s.buyBtnText}>{outOfStock ? "Out of Stock" : "Buy Now"}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default ProductQuickViewSheet;

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: "85%",
    paddingTop: 8,
  },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: "#DDDDDD" },
  close: {
    position: "absolute",
    top: 12,
    right: 14,
    zIndex: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F3F3",
    alignItems: "center",
    justifyContent: "center",
  },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  imageBox: {
    height: 200,
    borderRadius: 16,
    backgroundColor: "#FAFAFA",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: { width: "80%", height: "90%" },
  offBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "#D84315",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  offBadgeText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  name: { marginTop: 14, fontSize: 18, fontWeight: "800", color: C.navy },
  purity: { marginTop: 3, fontSize: 13, fontWeight: "700" },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 8, marginTop: 10 },
  price: { fontSize: 22, fontWeight: "900", color: C.navy },
  mrp: { fontSize: 14, color: C.grey, textDecorationLine: "line-through" },
  gstTag: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 5,
    marginTop: 8,
    backgroundColor: "#ECFDF5",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  gstTagText: { fontSize: 12, fontWeight: "700", color: C.green },
  sectionLabel: { marginTop: 16, marginBottom: 8, fontSize: 13, fontWeight: "700", color: C.navy },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    minWidth: 60,
    alignItems: "center",
    borderWidth: 1.2,
    borderColor: C.line,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: { fontSize: 13, fontWeight: "600", color: C.navy },
  weightOnly: { marginTop: 12, fontSize: 13, fontWeight: "600", color: C.navy },
  desc: { marginTop: 14, fontSize: 13, lineHeight: 19, color: C.grey },
  footer: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
  detailsBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.3,
    borderColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  detailsBtnText: { fontSize: 14, fontWeight: "700", color: C.accent },
  buyBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  buyBtnDisabled: { opacity: 0.5 },
  buyBtnText: { fontSize: 15, fontWeight: "800", color: "#FFFFFF" },
});
