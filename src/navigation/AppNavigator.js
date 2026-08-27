import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import { selectAccessToken } from '../store/authSlice';
import { GoldProvider } from '../context/GoldContext';

// ── Onboarding ────────────────────────────────────────────────────────────────
import DigitalGoldFlowScreen   from '../screens/DigitalGoldFlowScreen';
import HomeScreen              from '../screens/HomeScreen';
import FAQScreen               from '../screens/FAQScreen';

// ── Auth ──────────────────────────────────────────────────────────────────────
import LoginScreen             from '../screens/LoginScreen';
import RegisterScreen          from '../screens/RegisterScreen';

// ── Dashboard ─────────────────────────────────────────────────────────────────
import DigitalGoldScreen       from '../screens/DigitalGoldScreen';
import TransactionsScreen      from '../screens/TransactionsScreen';

// ── Buy Flow ──────────────────────────────────────────────────────────────────
import PaymentReviewScreen     from '../screens/PaymentReviewScreen';
import PaymentScreen           from '../screens/PaymentScreen';
import PaymentProcessingScreen from '../screens/PaymentProcessingScreen';
import PaymentSuccessScreen    from '../screens/PaymentSuccessScreen';

// ── Sell Flow ─────────────────────────────────────────────────────────────────
import SellGoldScreen          from '../screens/SellGoldScreen';
import SellSummaryScreen       from '../screens/SellSummaryScreen';
import BankAccountScreen       from '../screens/BankAccountScreen';
import SellProcessingScreen    from '../screens/SellProcessingScreen';
import SellSuccessScreen       from '../screens/SellSuccessScreen';

// ── Physical Gold ─────────────────────────────────────────────────────────────
import SplashScreen            from '../screens/SplashScreen';
import PgHomeScreen            from '../physicalGold/screens/PgHomeScreen';
import PgProductDetailsScreen  from '../physicalGold/screens/PgProductDetailsScreen';
import PgCartScreen            from '../physicalGold/screens/PgCartScreen';
import PgAddressScreen         from '../physicalGold/screens/PgAddressScreen';
import PgOrdersScreen          from '../physicalGold/screens/PgOrdersScreen';
import PgProfileScreen         from '../physicalGold/screens/PgProfileScreen';
import PgPaymentStatusScreen   from '../physicalGold/screens/PgPaymentStatusScreen';
import PgPaymentScreen         from '../physicalGold/screens/PgPaymentScreen';
import PgPaymentMethodScreen   from '../physicalGold/screens/PgPaymentMethodScreen';
import PgCheckoutScreen        from '../physicalGold/screens/PgCheckoutScreen';
import PgPaymentHandlerScreen  from '../physicalGold/screens/PgPaymentHandlerScreen';
import PgInvoiceViewerScreen   from '../physicalGold/screens/PgInvoiceViewerScreen';
import PgInvoiceDetailsScreen  from '../physicalGold/screens/PgInvoiceDetailsScreen';
import PgWishlistScreen        from '../physicalGold/screens/PgWishlistScreen';
import PgTermsScreen           from '../physicalGold/screens/PgTermsScreen';
import PgSearchScreen          from '../physicalGold/screens/PgSearchScreen';
import PgWalletScreen          from '../physicalGold/screens/PgWalletScreen';

const Stack = createNativeStackNavigator();
const SCREEN = { headerShown: false, animation: 'slide_from_right' };

/**
 * @param {{ navigationRef: React.RefObject }} props
 * navigationRef is forwarded from App.js so apiClient can reset the stack on session expiry.
 * 
 * NOTE: No screen receives accessToken or userId via initialParams.
 * All screens must read auth state via: useSelector(selectAccessToken) / useSelector(selectUserId)
 * 
 * AUTO-LOGIN: App always starts at Splash screen, which checks accessToken and navigates accordingly
 */
const AppNavigator = ({ navigationRef }) => {
  return (
    <NavigationContainer ref={navigationRef}>
      <GoldProvider navigationRef={navigationRef}>
        <Stack.Navigator initialRouteName="Splash" screenOptions={SCREEN}>

        {/* ── SPLASH ── */}
        <Stack.Screen name="Splash" component={SplashScreen} />

        {/* ── LANDING ── */}
        <Stack.Screen name="Home"       component={HomeScreen} />
        <Stack.Screen name="FAQ"        component={FAQScreen} />
        <Stack.Screen name="HowItWorks" component={DigitalGoldFlowScreen} />

        {/* ── AUTH ── */}
        <Stack.Screen name="Login"    component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />

        {/* ── DIGITAL GOLD ── */}
        <Stack.Screen name="Dashboard"      component={DigitalGoldScreen} />
        <Stack.Screen name="Transactions"   component={TransactionsScreen} />
        <Stack.Screen name="PaymentReview"  component={PaymentReviewScreen} />
        <Stack.Screen name="Payment"        component={PaymentScreen} />
        <Stack.Screen name="PaymentProcess" component={PaymentProcessingScreen} />
        <Stack.Screen name="PaymentSuccess" component={PaymentSuccessScreen} />

        {/* ── SELL FLOW ── */}
        <Stack.Screen name="SellGold"    component={SellGoldScreen} />
        <Stack.Screen name="SellSummary" component={SellSummaryScreen} />
        <Stack.Screen name="BankAccount" component={BankAccountScreen} />
        <Stack.Screen name="SellProcess" component={SellProcessingScreen} />
        <Stack.Screen name="SellSuccess" component={SellSuccessScreen} />

        {/* ── PHYSICAL GOLD ── */}
        <Stack.Screen name="PgHome"           component={PgHomeScreen} />
        <Stack.Screen name="PgProductDetails" component={PgProductDetailsScreen} />
        <Stack.Screen name="PgCart"           component={PgCartScreen} />
        <Stack.Screen name="PgAddress"        component={PgAddressScreen} />
        <Stack.Screen name="PgOrders"         component={PgOrdersScreen} />
        <Stack.Screen name="PgProfile"        component={PgProfileScreen} />
        <Stack.Screen name="PgWallet"         component={PgWalletScreen} />
        <Stack.Screen name="PgPaymentMethod"  component={PgPaymentMethodScreen} />
        <Stack.Screen name="PgCheckout"       component={PgCheckoutScreen} />
        <Stack.Screen name="PgPaymentHandler" component={PgPaymentHandlerScreen} />
        <Stack.Screen name="PgPaymentStatus"   component={PgPaymentStatusScreen} />
        <Stack.Screen name="PgInvoiceViewer"   component={PgInvoiceViewerScreen} />
        <Stack.Screen name="PgInvoiceDetails"  component={PgInvoiceDetailsScreen} />
        <Stack.Screen name="PgWishlist"        component={PgWishlistScreen} />
        <Stack.Screen name="PgTerms"           component={PgTermsScreen} />
        <Stack.Screen name="PgSearch"          component={PgSearchScreen} />

      </Stack.Navigator>
    </GoldProvider>
  </NavigationContainer>
  );
};

export default AppNavigator;
