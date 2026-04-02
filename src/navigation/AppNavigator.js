import React, { useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import { GoldProvider } from '../context/GoldContext';
import { selectAccessToken, selectUserId } from '../store/authSlice';

// ── Onboarding ────────────────────────────────────────────────────────────────
import DigitalGoldFlowScreen   from '../screens/DigitalGoldFlowScreen';
import HomeScreen              from '../screens/HomeScreen';
import FAQScreen               from '../screens/FAQScreen';

// ── Auth ──────────────────────────────────────────────────────────────────────
import LoginScreen             from '../screens/LoginScreen';
import RegisterScreen          from '../screens/RegisterScreen';

// ── Dashboard ─────────────────────────────────────────────────────────────────
import DigitalGoldScreen       from '../screens/DigitalGoldScreen';

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
import PgHomeScreen            from '../physicalGoldScreens/PgHomeScreen';
import PgProductDetailsScreen  from '../physicalGoldScreens/PgProductDetailsScreen';
import PgCartScreen            from '../physicalGoldScreens/PgCartScreen';
import PgAddressScreen         from '../physicalGoldScreens/PgAddressScreen';
import PgOrdersScreen          from '../physicalGoldScreens/PgOrdersScreen';
import PgProfileScreen         from '../physicalGoldScreens/PgProfileScreen';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const navigationRef = useRef(null);
  const accessToken = useSelector(selectAccessToken) || null;
  const userId = useSelector(selectUserId) || null;

  return (
    <NavigationContainer ref={navigationRef}>
      <GoldProvider navigationRef={navigationRef}>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
        >
          {/* ── LANDING ── */}
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="FAQ" component={FAQScreen} />

          {/* ── ONBOARDING ── */}
          <Stack.Screen name="HowItWorks" component={DigitalGoldFlowScreen} />

          {/* ── AUTH ── */}
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />

          {/* ── DIGITAL GOLD DASHBOARD ── */}
          <Stack.Screen 
            name="Dashboard" 
            component={DigitalGoldScreen}
            initialParams={{ accessToken, userId }}
          />

          {/* ── DIGITAL GOLD BUY FLOW ── */}
          <Stack.Screen 
            name="PaymentReview" 
            component={PaymentReviewScreen}
            initialParams={{ accessToken, userId }}
          />
          <Stack.Screen 
            name="Payment" 
            component={PaymentScreen}
            initialParams={{ accessToken, userId }}
          />
          <Stack.Screen 
            name="PaymentProcess" 
            component={PaymentProcessingScreen}
            initialParams={{ accessToken, userId }}
          />
          <Stack.Screen 
            name="PaymentSuccess" 
            component={PaymentSuccessScreen}
            initialParams={{ accessToken, userId }}
          />

          {/* ── DIGITAL GOLD SELL FLOW ── */}
          <Stack.Screen 
            name="SellGold" 
            component={SellGoldScreen}
            initialParams={{ accessToken, userId }}
          />
          <Stack.Screen 
            name="SellSummary" 
            component={SellSummaryScreen}
            initialParams={{ accessToken, userId }}
          />
          <Stack.Screen 
            name="BankAccount" 
            component={BankAccountScreen}
            initialParams={{ accessToken, userId }}
          />
          <Stack.Screen 
            name="SellProcess" 
            component={SellProcessingScreen}
            initialParams={{ accessToken, userId }}
          />
          <Stack.Screen 
            name="SellSuccess" 
            component={SellSuccessScreen}
            initialParams={{ accessToken, userId }}
          />

          {/* ── PHYSICAL GOLD ── */}
          <Stack.Screen 
            name="PgHome" 
            component={PgHomeScreen}
            initialParams={{ accessToken, userId }}
          />
          <Stack.Screen 
            name="PgProductDetails" 
            component={PgProductDetailsScreen}
            initialParams={{ accessToken, userId }}
          />
          <Stack.Screen 
            name="PgCart" 
            component={PgCartScreen}
            initialParams={{ accessToken, userId }}
          />
          <Stack.Screen 
            name="PgAddress" 
            component={PgAddressScreen}
            initialParams={{ accessToken, userId }}
          />
          <Stack.Screen 
            name="PgOrders" 
            component={PgOrdersScreen}
            initialParams={{ accessToken, userId }}
          />
          <Stack.Screen 
            name="PgProfile" 
            component={PgProfileScreen}
            initialParams={{ accessToken, userId }}
          />
        </Stack.Navigator>
      </GoldProvider>
    </NavigationContainer>
  );
};

export default AppNavigator;
