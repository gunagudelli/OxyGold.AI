import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Image, Pressable, TouchableOpacity, StyleSheet, Linking, Animated, Easing, PanResponder } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { useInView } from "./ScrollReveal";

const VIOLET = "#503189";
const open = (url) => Linking.openURL(url).catch(() => {});

const IBJA_CERTIFICATE_URL = "https://drive.google.com/file/d/1JXREXS8gMcjc292mMj043yDRG1ohzya8/view";

export const IbjaPartnerCard = memo(() => (
  <View style={[styles.section, styles.ibjaCard]}>
    <View style={styles.ibjaMark}>
      <Image source={require("../../../assets/ibja-partner.png")} style={styles.ibjaImage} resizeMode="contain" fadeDuration={0} />
    </View>
    <View style={styles.ibjaCopy}>
      <Text style={styles.ibjaLabel}>IBJA</Text>
      <Text style={styles.ibjaTitle}>Platinum Partner</Text>
      <Text style={styles.caption}>India Bullion and Jewellers Association</Text>
      <TouchableOpacity
        accessibilityRole="link"
        activeOpacity={0.75}
        onPress={() => open(IBJA_CERTIFICATE_URL)}
        style={styles.certificateLink}
      >
        <Text style={styles.certificateText}>View Certificate</Text>
        <Ionicons name="arrow-forward" size={13} color={VIOLET} />
      </TouchableOpacity>
    </View>
  </View>
));

const TEAM = [
  { name: "RadhaKrishna.T", role: "Co-Founder & CEO", img: require("../../../assets/team/radha.jpg"), linkedin: "https://www.linkedin.com/in/oxyradhakrishna/" },
  { name: "Ramadevi.T", role: "Co-Founder & CTO", img: require("../../../assets/team/rama.jpg"), linkedin: "https://www.linkedin.com/in/ramadevi-thatavarti/" },
  { name: "Subhash.S", role: "Co-Founder", img: require("../../../assets/team/subhash.jpg"), linkedin: "https://www.linkedin.com/in/ssure/" },
  { name: "Jagadeesh Chinnam", role: "AI Transformation Leader", img: require("../../../assets/team/jagadeesh.jpg"), linkedin: "https://www.linkedin.com/in/jc-cv/" },
  { name: "Snehalatha Reddy", role: "Co-Founder", img: require("../../../assets/team/sneha.jpg"), linkedin: "https://www.linkedin.com/in/sneha-soma-18681a19b/" },
  { name: "Yadavalli Srinivas", role: "Co-Founder", img: require("../../../assets/team/srinivas.jpg"), linkedin: "https://www.linkedin.com/in/yadavallisrinivas/" },
  { name: "Ramesh.R", role: "Co-Founder", img: require("../../../assets/team/ramesh.jpg"), linkedin: "https://www.linkedin.com/in/k-ramesh-reddy-a2150b15/" },
  { name: "Narendra Kumar", role: "Co-Founder", img: require("../../../assets/team/narendra.jpg"), linkedin: "https://www.linkedin.com/in/narendra-kumar-balijepalli-bb4a96129/" },
];

// One slide at a time, full width. Slides to the next automatically every
// `interval` ms (looping), with a native smooth slide. Swiping works too —
// manual input pauses the auto-slide briefly. Dots show the position. Auto-slide runs only
// while the section is on screen and Home is focused (no wasted work).
const RESUME_AFTER = 6000;

// One item at a time with a soft fade-and-zoom change (out: fade + shrink to
// 96%, in: fade + grow back). Auto-advances every `interval` ms while on
// screen and Home is focused; swipe left/right changes it by hand (and pauses
// the auto-advance briefly). Dots show the position.
const FadePager = ({ items, children, interval = 3500 }) => {
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const busy = useRef(false);
  const pausedUntil = useRef(0);
  const fade = useRef(new Animated.Value(1)).current;
  const wrapRef = useRef(null);
  const { inView, onLayout } = useInView(wrapRef);
  const focused = useIsFocused();

  const goTo = useCallback(
    (next) => {
      if (busy.current) return;
      busy.current = true;
      const i = (next + items.length) % items.length;
      Animated.timing(fade, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
        isInteraction: false,
      }).start(() => {
        indexRef.current = i;
        setIndex(i);
        Animated.timing(fade, {
          toValue: 1,
          duration: 320,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
          isInteraction: false,
        }).start(() => {
          busy.current = false;
        });
      });
    },
    [fade, items.length],
  );

  useEffect(() => {
    if (!inView || !focused || items.length < 2) return undefined;
    const t = setInterval(() => {
      if (Date.now() < pausedUntil.current) return;
      goTo(indexRef.current + 1);
    }, interval);
    return () => clearInterval(t);
  }, [inView, focused, interval, items.length, goTo]);

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderRelease: (_, g) => {
        if (Math.abs(g.dx) < 40) return;
        pausedUntil.current = Date.now() + RESUME_AFTER;
        goTo(indexRef.current + (g.dx < 0 ? 1 : -1));
      },
    }),
  ).current;

  const scale = fade.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] });

  return (
    <View ref={wrapRef} collapsable={false} onLayout={onLayout} {...pan.panHandlers}>
      <Animated.View style={{ opacity: fade, transform: [{ scale }] }}>{children(items[index])}</Animated.View>
      <View style={styles.dots}>
        {items.map((it, i) => (
          <View key={it.name} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
};

export const LeadershipTeam = memo(() => (
  <View style={styles.teamBand}>
    <Text style={[styles.title, styles.teamTitle]} accessibilityRole="header">
      Meet Our Visionaries
    </Text>
    <FadePager items={TEAM}>
      {(member) => (
        <Pressable
          style={styles.member}
          onPress={() => open(member.linkedin)}
          accessibilityRole="link"
          accessibilityLabel={member.name + ", " + member.role + " on LinkedIn"}
        >
          <View style={styles.portraitRing}>
            <Image key={member.name} source={member.img} style={styles.portrait} fadeDuration={0} />
          </View>
          <View style={styles.memberText}>
            <Text style={styles.memberName}>{member.name}</Text>
            <View style={styles.memberRoleRow}>
              <Text style={styles.memberRole}>{member.role}</Text>
              <Ionicons name="logo-linkedin" size={14} color="#0A66C2" />
            </View>
          </View>
        </Pressable>
      )}
    </FadePager>
  </View>
));

const GROUP = [
  { name: "AskOxy.ai", logo: require("../../../assets/group/askoxylogo.png"), href: "https://www.askoxy.ai/", dark: true },
  { name: "OxyLoans", logo: require("../../../assets/group/oxyloanslogo.png"), href: "https://www.oxyloans.com/" },
  { name: "OxyBricks", logo: require("../../../assets/group/oxybrickslogo.png"), href: "https://www.oxybricks.world/", dark: true },
  { name: "Oxyglobal.tech", logo: require("../../../assets/group/global-logo.png"), href: "https://www.oxyglobal.tech/", dark: true },
  { name: "OXYFINSERV", logo: require("../../../assets/group/oxyfinservlogo-Cpr9-A3-NT.png"), href: "https://www.oxyfinserv.com/" },
  { name: "OXYCHAIN", logo: require("../../../assets/group/l5.png"), href: "http://bmv.money:2750/" },
  { name: "TVRK", logo: require("../../../assets/group/tv-white.png"), href: "https://tvradhakrishna.com/", dark: true },
];

// Continuous logo strip (marquee): logos glide right → left and loop
// seamlessly (the list is drawn twice; we slide by exactly one copy).
// Native-driver transform; runs only while on screen and Home is focused.
const MARQUEE_SPEED = 40; // px per second

export const GroupCompanies = memo(() => {
  const shift = useRef(new Animated.Value(0)).current;
  const [copyWidth, setCopyWidth] = useState(0);
  const wrapRef = useRef(null);
  const { inView, onLayout } = useInView(wrapRef);
  const focused = useIsFocused();

  useEffect(() => {
    if (!copyWidth || !inView || !focused) return undefined;
    let anim;
    const run = () => {
      // Continue from wherever it paused, at constant speed.
      const from = shift.__getValue();
      const remaining = copyWidth + from; // from is 0 … -copyWidth
      anim = Animated.timing(shift, {
        toValue: -copyWidth,
        duration: (remaining / MARQUEE_SPEED) * 1000,
        easing: Easing.linear,
        useNativeDriver: true,
        isInteraction: false,
      });
      anim.start(({ finished }) => {
        if (!finished) return;
        shift.setValue(0);
        run();
      });
    };
    run();
    return () => anim && anim.stop();
  }, [copyWidth, inView, focused, shift]);

  const renderCopy = (copy) =>
    GROUP.map((company) => (
      <Pressable
        key={copy + company.name}
        accessibilityRole="link"
        accessibilityLabel={"Visit " + company.name}
        onPress={() => open(company.href)}
        style={[styles.marqueeTile, company.dark ? styles.groupSlideDark : styles.groupSlideLight]}
      >
        <Image source={company.logo} style={styles.marqueeLogo} resizeMode="contain" fadeDuration={0} />
      </Pressable>
    ));

  return (
    <View
      ref={wrapRef}
      collapsable={false}
      onLayout={onLayout}
      style={styles.groupBand}
      accessibilityLabel="OXY Group Companies"
    >
      <Animated.View style={[styles.marqueeTrack, { transform: [{ translateX: shift }] }]}>
        <View
          style={styles.marqueeCopy}
          onLayout={(e) => setCopyWidth(Math.round(e.nativeEvent.layout.width))}
        >
          {renderCopy("a")}
        </View>
        <View style={styles.marqueeCopy}>{renderCopy("b")}</View>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  section: { marginTop: 24, marginHorizontal: 16 },
  title: { color: "#333333", fontSize: 20, fontWeight: "600", letterSpacing: -0.3 },
  sectionCaption: { color: "#625C6B", fontSize: 13, marginTop: 2, marginBottom: 12 },
  caption: { color: "#625C6B", fontSize: 11, lineHeight: 15 },
  ibjaCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: "#FFFCF5",
    borderWidth: 1,
    borderColor: "#E9DDBF",
    borderRadius: 16,
  },
  ibjaMark: {
    width: 112,
    height: 96,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FCF6E9",
    borderRadius: 12,
  },
  ibjaImage: { width: 104, height: 86 },
  ibjaCopy: { flex: 1 },
  ibjaLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 1.1, color: "#755515" },
  ibjaTitle: { fontSize: 15, fontWeight: "700", color: "#282130", marginBottom: 2 },
  certificateLink: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 4, minHeight: 32 },
  certificateText: { color: VIOLET, fontSize: 12, fontWeight: "700", flexShrink: 1 },

  centerText: { textAlign: "center" },

  // Meet Our Visionaries — full-width lavender band, no card
  teamBand: { marginTop: 20, paddingTop: 14, paddingBottom: 10, backgroundColor: "#F5F1FB" },
  teamTitle: { fontSize: 17, fontWeight: "700", marginHorizontal: 16, marginBottom: 10 },
  member: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16, paddingHorizontal: 16 },
  portraitRing: {
    width: 108,
    height: 108,
    borderRadius: 54,
    padding: 3,
    backgroundColor: "#FFFFFF",
  },
  portrait: { width: "100%", height: "100%", borderRadius: 51, backgroundColor: "#EEE9F4" },
  memberName: { color: "#282130", fontSize: 16, fontWeight: "700" },
  memberText: { flexShrink: 1, maxWidth: 210 },
  memberRoleRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 },
  memberRole: { color: VIOLET, fontSize: 13, fontWeight: "600" },
  dots: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 5, marginTop: 8 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#D6CBEA" },
  dotActive: { width: 14, backgroundColor: VIOLET },

  // OXY Group Companies — logo only; each slide carries its own background
  groupBand: { marginTop: 16, paddingVertical: 10, overflow: "hidden", backgroundColor: "#FFFFFF" },
  groupTitle: { marginBottom: 14, marginHorizontal: 16 },
  groupSlide: { height: 84, alignItems: "center", justifyContent: "center", paddingHorizontal: 56 },
  groupSlideDark: { backgroundColor: "#2A1D5C" },
  groupSlideLight: { backgroundColor: "#F4F0FA" },
  groupLogo: { width: "100%", maxWidth: 220, height: 50 },
  marqueeTrack: { flexDirection: "row" },
  marqueeCopy: { flexDirection: "row" },
  marqueeTile: {
    width: 150,
    height: 64,
    marginRight: 12,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  marqueeLogo: { width: "100%", height: "100%" },
});
