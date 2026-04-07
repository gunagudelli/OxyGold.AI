import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Dimensions,
  TouchableOpacity,
  Platform,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");

const faqData = [
  {
    question: "What is Digital Gold?",
    answer:
      "Digital Gold allows you to buy gold online. Every gram you purchase is backed by physical gold stored securely with a trusted partner.",
  },
  {
    question: "Who is the gold partner?",
    answer:
      "The physical gold is stored with an authorized and trusted gold partner in insured vaults, as per their terms and conditions.",
  },
  {
    question: "Is Digital Gold regulated by RBI or SEBI?",
    answer:
      "No. Digital Gold is not regulated by RBI or SEBI. It is backed by physical gold stored with a partner, but it is not a regulated investment product.",
  },
  {
    question: "How can I buy Digital Gold?",
    answer:
      "You can buy Digital Gold instantly using Indian Rupees (₹) or by selecting the quantity in grams. Just confirm the live price and complete the payment.",
  },
  {
    question: "What is the minimum amount required to buy Digital Gold?",
    answer:
      "You can start buying Digital Gold with a very small amount, making it accessible even for first-time investors.",
  },
  {
    question: "At what price is Digital Gold bought?",
    answer:
      "Digital Gold is bought at the live market price at the time of purchase, which may include partner charges.",
  },
  {
    question: "Where is my Digital Gold stored?",
    answer:
      "Your gold is stored safely in insured vaults managed by the gold partner. You don't need to worry about storage or security.",
  },
  {
    question: "Can I track my Digital Gold value?",
    answer:
      "Yes. The value of your Digital Gold updates in real time based on current gold market prices.",
  },
  {
    question: "Can I sell Digital Gold anytime?",
    answer:
      "Yes. You can sell your Digital Gold anytime through the app, subject to partner availability and terms.",
  },
  {
    question: "At what price is Digital Gold sold?",
    answer:
      "Digital Gold is sold at the live market price at the time of selling.",
  },
  {
    question: "How will I receive money after selling Digital Gold?",
    answer:
      "The sale amount is credited to your linked bank account or wallet as per the app's payout flow.",
  },
  {
    question: "Are there any charges for buying or selling?",
    answer:
      "Partner charges such as spread, GST, or minting charges (for physical conversion) may apply. These are shown during the transaction.",
  },
  {
    question: "Is my Digital Gold insured?",
    answer:
      "Yes. The physical gold stored with the partner is insured as per their storage policy.",
  },
  {
    question: "Can I convert Digital Gold into physical gold?",
    answer:
      "Depending on the partner's terms, you may be able to convert Digital Gold into physical gold coins or jewellery. Additional charges may apply.",
  },
  {
    question: "What are the risks of Digital Gold?",
    answer:
      "The value of Digital Gold depends on market prices and may fluctuate. Since it is not regulated by RBI or SEBI, users should understand the risks before investing.",
  },
];

const steps = [
  {
    title: "Check Live Gold Price",
    icon: "livePrice",
  },
  {
    title: "Enter Amount in ₹ or in Grams",
    icon: "enterAmount",
  },
  {
    title: "Make Payment Securely",
    icon: "secureBuy",
  },
  {
    title: "Gold Stored in Insured Vaults",
    icon: "vault",
  },
  {
    title: "Track Your Gold Balance",
    icon: "trackBalance",
  },
];

const DigitalGoldFlowScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [faqVisible, setFaqVisible] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [answerAnimations, setAnswerAnimations] = useState({});
  const faqSlideAnim = useRef(new Animated.Value(-100)).current;
  const faqOpacity = useRef(new Animated.Value(0)).current;
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const stepAnimations = useRef(
    steps.map(() => ({
      opacity: new Animated.Value(0),
    })),
  ).current;

  const toggleFaq = (index) => {
    if (expandedFaq === index) {
      if (answerAnimations[index]) {
        Animated.timing(answerAnimations[index], {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }).start(() => {
          setExpandedFaq(null);
        });
      }
    } else {
      setExpandedFaq(index);
      if (!answerAnimations[index]) {
        const newAnim = new Animated.Value(0);
        setAnswerAnimations((prev) => ({ ...prev, [index]: newAnim }));
        setTimeout(() => {
          Animated.timing(newAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: false,
          }).start();
        }, 50);
      } else {
        Animated.timing(answerAnimations[index], {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }).start();
      }
    }
  };

  const openFaq = () => {
    setFaqVisible(true);
    Animated.parallel([
      Animated.timing(faqSlideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(faqOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeFaq = () => {
    Animated.parallel([
      Animated.timing(faqSlideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(faqOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setFaqVisible(false);
      setExpandedFaq(null);
    });
  };

  useEffect(() => {
    Animated.timing(heroOpacity, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    const animations = stepAnimations.map((anim, index) => {
      return Animated.timing(anim.opacity, {
        toValue: 1,
        duration: 600,
        delay: index * 150,
        useNativeDriver: true,
      });
    });

    Animated.stagger(100, animations).start();
  }, []);

  const renderIcon = (type) => {
    const icons = {
      livePrice: (
        <View style={styles.iconContent}>
          <View style={styles.mobileIcon}>
            <Text style={styles.rupeeIcon}>₹</Text>
          </View>
          <View style={styles.chartContainer}>
            {[8, 12, 16, 10, 14].map((h, i) => (
              <View key={i} style={[styles.chartBar, { height: h }]} />
            ))}
          </View>
        </View>
      ),
      enterAmount: (
        <View style={styles.iconContent}>
          <Text style={styles.rupeeIcon}>₹</Text>
          <View style={styles.goldBar} />
        </View>
      ),
      secureBuy: (
        <View style={styles.iconContent}>
          <View style={styles.shield}>
            <Text style={styles.shieldIcon}>🛡️</Text>
          </View>
          <View style={styles.goldBar} />
        </View>
      ),
      vault: (
        <View style={styles.iconContent}>
          <View style={styles.vault}>
            <View style={styles.vaultDoor} />
          </View>
        </View>
      ),
      trackBalance: (
        <View style={styles.iconContent}>
          <View style={styles.mobileWallet}>
            <View style={styles.goldCoin} />
          </View>
        </View>
      ),
    };
    return icons[type];
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <LinearGradient
        colors={["#F8F9FA", "#FFFFFF", "#F8F9FA"]}
        style={styles.backgroundGradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate("FAQ")}
            style={styles.faqButton}
          >
            <Text style={styles.faqText}>FAQ</Text>
          </TouchableOpacity>
        </View>

        {/* Hero Section */}
        <Animated.View style={[styles.hero, { opacity: heroOpacity }]}>
          <Text style={styles.title}>How to Buy Digital Gold</Text>
          <Text style={styles.subtitle}>
            Simple steps to start your gold investment journey
          </Text>
        </Animated.View>

        {/* Flow Steps */}
        <View style={styles.flowContainer}>
          {steps.map((item, index) => (
            <View key={index}>
              <Animated.View
                style={[
                  styles.stepCard,
                  { opacity: stepAnimations[index].opacity },
                ]}
              >
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.stepIconContainer}>
                  {renderIcon(item.icon)}
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>{item.title}</Text>
                  <Text style={styles.stepDesc}>{item.desc}</Text>
                </View>
              </Animated.View>
              {index < steps.length - 1 && (
                <View style={styles.arrowDown}>
                  <Ionicons name="arrow-down" size={22} color="#464B8B" />
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Bottom CTA */}
        <View style={styles.ctaContainer}>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => navigation.navigate("Dashboard")}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={["#464B8B", "#5A5A9A", "#464B8B"]}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonText}>Start Buying Gold</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* FAQ Overlay */}

      {faqVisible && (
        <Animated.View
          style={[
            styles.faqOverlay,
            {
              opacity: faqOpacity,
              transform: [{ translateY: faqSlideAnim }],
            },
          ]}
        >
          <View style={[styles.faqHeader, { paddingTop: insets.top + 12 }]}>
            <TouchableOpacity onPress={closeFaq} style={styles.faqBackButton}>
              <Text style={styles.faqBackText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.faqTitle}>Digital Gold FAQ</Text>
          </View>

          <ScrollView
            style={styles.faqContent}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 20 }}
          >
            <Text style={styles.faqIntroText}>Please understand</Text>
            {faqData.map((item, index) => (
              <View key={index} style={styles.faqItem}>
                <TouchableOpacity
                  onPress={() => toggleFaq(index)}
                  style={styles.faqQuestion}
                >
                  <Text style={styles.faqQuestionText}>{item.question}</Text>
                  <Text style={styles.faqToggle}>
                    {expandedFaq === index ? "−" : "+"}
                  </Text>
                </TouchableOpacity>
                {expandedFaq === index && (
                  <Animated.View
                    style={[
                      styles.faqAnswer,
                      {
                        opacity: answerAnimations[index] || 0,
                        maxHeight: answerAnimations[index]
                          ? answerAnimations[index].interpolate({
                              inputRange: [0, 1],
                              outputRange: [0, 200],
                            })
                          : 0,
                      },
                    ]}
                  >
                    <Text style={styles.faqAnswerText}>{item.answer}</Text>
                  </Animated.View>
                )}
              </View>
            ))}
          </ScrollView>
        </Animated.View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  backgroundGradient: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 8 : 12,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#464B8B",
    justifyContent: "center",
    alignItems: "center",
  },
  backText: {
    fontSize: 18,
    color: "#464B8B",
    fontWeight: "600",
  },
  faqButton: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 15,
    backgroundColor: "rgba(218, 165, 32, 0.1)",
    borderWidth: 1,
    borderColor: "#DAA520",
  },
  faqText: {
    fontSize: 14,
    color: "#DAA520",
    fontWeight: "500",
  },
  hero: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#464B8B",
    marginBottom: 16,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#666666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 36,
  },
  flowContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  stepCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#464B8B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#DAA520",
  },
  stepNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#464B8B",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  stepNumberText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  stepIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(218, 165, 32, 0.08)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
    borderWidth: 1,
    borderColor: "#DAA520",
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 3,
  },
  stepDesc: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
  },
  arrowDown: {
    alignItems: "center",
    marginVertical: 6,
  },
  iconContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  mobileIcon: {
    width: 20,
    height: 24,
    backgroundColor: "#DAA520",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 4,
  },
  goldBar: {
    width: 20,
    height: 6,
    backgroundColor: "#DAA520",
    borderRadius: 3,
    marginLeft: 4,
  },
  rupeeIcon: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  shield: {
    marginRight: 4,
  },
  shieldIcon: {
    fontSize: 18,
  },
  vault: {
    width: 24,
    height: 20,
    backgroundColor: "#4B5563",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  vaultDoor: {
    width: 16,
    height: 12,
    backgroundColor: "#DAA520",
    borderRadius: 2,
  },
  mobileWallet: {
    width: 24,
    height: 28,
    backgroundColor: "#8B4513",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  goldCoin: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#DAA520",
  },
  chartContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginLeft: 4,
  },
  chartBar: {
    width: 3,
    backgroundColor: "#DAA520",
    marginHorizontal: 0.5,
    borderRadius: 1,
  },
  ctaContainer: {
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 35,
    alignItems: "center",
  },
  ctaButton: {
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#464B8B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 48,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  faqOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FFFFFF",
    zIndex: 1000,
  },
  faqHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: "#464B8B",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  faqBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  faqBackText: {
    fontSize: 20,
    color: "#FFFFFF",
    fontWeight: "500",
  },
  faqTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    flex: 1,
  },
  faqContent: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  faqItem: {
    marginHorizontal: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: "#DAA520",
  },
  faqQuestion: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 0,
  },
  faqQuestionText: {
    fontSize: 16,
    fontWeight: "normal",
    color: "#1A1A1A",
    flex: 1,
    lineHeight: 22,
  },
  faqToggle: {
    fontSize: 18,
    color: "#DAA520",
    fontWeight: "600",
  },
  faqAnswer: {
    paddingBottom: 18,
    paddingHorizontal: 0,
  },
  faqAnswerText: {
    fontSize: 15,
    color: "#4A5568",
    lineHeight: 22,
  },
  faqIntroText: {
    fontSize: 16,
    color: "#333333",
    marginHorizontal: 20,
    marginBottom: 20,
    fontWeight: "500",
  },
});

export default DigitalGoldFlowScreen;
