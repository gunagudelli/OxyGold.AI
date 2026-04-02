import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
  Dimensions, Modal, Pressable,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const NAV_ITEMS = [
  { label: 'Home',         screen: 'Home' },
  { label: 'How It Works', screen: 'HowItWorks' },
  { label: 'FAQ',          screen: 'FAQ' },
];

const AUTH_NAV_ITEMS = [
  { label: 'Buy Gold',  screen: 'Dashboard' },
  { label: 'Portfolio', screen: 'Portfolio' },
];

const Header = ({ navigation, currentScreen = '' }) => {
  const [user, setUser]           = useState(null);
  const [menuOpen, setMenuOpen]   = useState(false);
  const slideAnim                 = useRef(new Animated.Value(-300)).current;
  const overlayAnim               = useRef(new Animated.Value(0)).current;

  // Load user from storage
  useEffect(() => {
    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem('auth_tokens');
        setUser(raw ? JSON.parse(raw) : null);
      } catch { setUser(null); }
    };
    load();
    // Re-check whenever screen focuses
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [navigation]);

  const openMenu = () => {
    setMenuOpen(true);
    Animated.parallel([
      Animated.timing(slideAnim,   { toValue: 0,   duration: 280, useNativeDriver: true }),
      Animated.timing(overlayAnim, { toValue: 1,   duration: 280, useNativeDriver: true }),
    ]).start();
  };

  const closeMenu = (cb) => {
    Animated.parallel([
      Animated.timing(slideAnim,   { toValue: -300, duration: 240, useNativeDriver: true }),
      Animated.timing(overlayAnim, { toValue: 0,    duration: 240, useNativeDriver: true }),
    ]).start(() => { setMenuOpen(false); cb && cb(); });
  };

  const handleNav = (screen) => {
    closeMenu(() => navigation.navigate(screen));
  };

  const handleLogout = async () => {
    closeMenu(async () => {
      await AsyncStorage.multiRemove(['auth_tokens', 'user']);
      setUser(null);
      navigation.replace('Home');
    });
  };

  const allNavItems = user
    ? [...NAV_ITEMS, ...AUTH_NAV_ITEMS]
    : NAV_ITEMS;

  return (
    <>
      {/* ── Top Bar ── */}
      <View style={s.bar}>
        {/* Logo */}
        <TouchableOpacity onPress={() => navigation.navigate('Home')} activeOpacity={0.8}>
          <Text style={s.logo}>
            <Text style={s.logoOxy}>OXY</Text>
            <Text style={s.logoGold}>GOLD</Text>
          </Text>
        </TouchableOpacity>

        {/* Right side */}
        <View style={s.right}>
          {/* OXYGOLD.AI pill */}
          <TouchableOpacity
            style={[s.aiPill, currentScreen === 'OxygoldAI' && s.aiPillActive]}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('OxygoldAI')}
          >
            <View style={[s.aiDot, currentScreen === 'OxygoldAI' && s.aiDotActive]} />
            <Text style={[s.aiText, currentScreen === 'OxygoldAI' && s.aiTextActive]}>
              OXYGOLD.AI
            </Text>
          </TouchableOpacity>

          {/* Login / Avatar */}
          {user ? (
            <TouchableOpacity style={s.avatar} onPress={openMenu} activeOpacity={0.8}>
              <Text style={s.avatarText}>
                {user.userId ? user.userId.toString().slice(-2).toUpperCase() : 'ME'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={s.loginBtn}
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.85}
            >
              <Text style={s.loginBtnText}>Sign Up</Text>
            </TouchableOpacity>
          )}

          {/* Hamburger */}
          <TouchableOpacity style={s.ham} onPress={openMenu} activeOpacity={0.7}>
            <View style={s.hamLine} />
            <View style={[s.hamLine, { width: 14 }]} />
            <View style={s.hamLine} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Drawer Modal ── */}
      {menuOpen && (
        <Modal transparent animationType="none" onRequestClose={() => closeMenu()}>
          {/* Overlay */}
          <Animated.View style={[s.overlay, { opacity: overlayAnim }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => closeMenu()} />
          </Animated.View>

          {/* Drawer */}
          <Animated.View style={[s.drawer, { transform: [{ translateX: slideAnim }] }]}>
            {/* Drawer Header */}
            <View style={s.drawerHeader}>
              <Text style={s.logo}>
                <Text style={s.logoOxy}>OXY</Text>
                <Text style={s.logoGold}>GOLD</Text>
              </Text>
              <TouchableOpacity onPress={() => closeMenu()} style={s.closeBtn}>
                <Text style={s.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Nav Items */}
            <View style={s.drawerNav}>
              {allNavItems.map(({ label, screen }) => (
                <TouchableOpacity
                  key={screen}
                  style={[s.drawerItem, currentScreen === screen && s.drawerItemActive]}
                  onPress={() => handleNav(screen)}
                  activeOpacity={0.75}
                >
                  <Text style={[s.drawerItemText, currentScreen === screen && s.drawerItemTextActive]}>
                    {label}
                  </Text>
                  {currentScreen === screen && <View style={s.drawerActiveDot} />}
                </TouchableOpacity>
              ))}

              {/* OXYGOLD.AI */}
              <TouchableOpacity
                style={[s.drawerItem, s.drawerAiItem, currentScreen === 'OxygoldAI' && s.drawerItemActive]}
                onPress={() => handleNav('OxygoldAI')}
                activeOpacity={0.75}
              >
                <View style={s.aiDot} />
                <Text style={[s.drawerItemText, s.drawerAiText]}>OXYGOLD.AI</Text>
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={s.drawerDivider} />

            {/* Auth Actions */}
            <View style={s.drawerFooter}>
              {user ? (
                <>
                  <View style={s.drawerUserInfo}>
                    <View style={s.drawerAvatar}>
                      <Text style={s.avatarText}>
                        {user.userId ? user.userId.toString().slice(-2).toUpperCase() : 'ME'}
                      </Text>
                    </View>
                    <View>
                      <Text style={s.drawerUserLabel}>Logged in</Text>
                      <Text style={s.drawerUserId}>ID: {user.userId || '—'}</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
                    <Text style={s.logoutBtnText}>Logout</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={s.drawerSignupBtn}
                  onPress={() => handleNav('Login')}
                  activeOpacity={0.85}
                >
                  <Text style={s.drawerSignupText}>Sign Up / Login  →</Text>
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        </Modal>
      )}
    </>
  );
};

const s = StyleSheet.create({
  // Top bar
  bar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 13,
    backgroundColor: 'rgba(26,48,120,0.97)',
    borderBottomWidth: 1, borderBottomColor: 'rgba(240,187,58,0.12)',
  },
  logo:     { fontSize: 18, fontWeight: '800', letterSpacing: -0.2 },
  logoOxy:  { color: 'rgba(255,255,255,0.85)' },
  logoGold: { color: '#f0bb3a' },

  right: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  // AI pill
  aiPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 5, borderWidth: 1, borderColor: 'rgba(240,187,58,0.28)',
    backgroundColor: 'rgba(240,187,58,0.06)',
  },
  aiPillActive: { backgroundColor: '#f0bb3a', borderColor: '#f0bb3a' },
  aiDot:        { width: 5, height: 5, borderRadius: 3, backgroundColor: '#f0bb3a' },
  aiDotActive:  { backgroundColor: '#0d1f3c' },
  aiText:       { fontSize: 10, fontWeight: '700', color: '#f0bb3a', letterSpacing: 0.6 },
  aiTextActive: { color: '#0d1f3c' },

  // Login btn
  loginBtn: {
    paddingHorizontal: 14, paddingVertical: 6,
    backgroundColor: '#f0bb3a', borderRadius: 5,
  },
  loginBtnText: { fontSize: 12, fontWeight: '700', color: '#0d1f3c' },

  // Avatar
  avatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(240,187,58,0.15)',
    borderWidth: 1, borderColor: 'rgba(240,187,58,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 11, fontWeight: '700', color: '#f0bb3a' },

  // Hamburger
  ham:     { padding: 4, gap: 5, justifyContent: 'center' },
  hamLine: { width: 20, height: 2, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 2 },

  // Overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    zIndex: 10,
  },

  // Drawer
  drawer: {
    position: 'absolute', top: 0, left: 0, bottom: 0,
    width: Math.min(width * 0.78, 300),
    backgroundColor: '#0d1f3c',
    borderRightWidth: 1, borderRightColor: 'rgba(240,187,58,0.12)',
    zIndex: 20, paddingTop: 52,
  },
  drawerHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 20,
    borderBottomWidth: 1, borderBottomColor: 'rgba(240,187,58,0.1)',
  },
  closeBtn:     { padding: 6 },
  closeBtnText: { fontSize: 16, color: 'rgba(255,255,255,0.5)' },

  drawerNav:  { paddingHorizontal: 12, paddingTop: 12, gap: 2 },
  drawerItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 12, borderRadius: 8,
  },
  drawerItemActive:     { backgroundColor: 'rgba(240,187,58,0.1)' },
  drawerItemText:       { fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.6)' },
  drawerItemTextActive: { color: '#f0bb3a', fontWeight: '600' },
  drawerActiveDot:      { width: 5, height: 5, borderRadius: 3, backgroundColor: '#f0bb3a' },
  drawerAiItem: {
    marginTop: 4, gap: 8,
    borderWidth: 1, borderColor: 'rgba(240,187,58,0.25)',
    backgroundColor: 'rgba(240,187,58,0.05)',
  },
  drawerAiText: { color: '#f0bb3a', fontWeight: '700', letterSpacing: 0.5, flex: 1 },

  drawerDivider: { height: 1, backgroundColor: 'rgba(240,187,58,0.1)', marginHorizontal: 20, marginVertical: 16 },

  drawerFooter:   { paddingHorizontal: 20 },
  drawerUserInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  drawerAvatar:   {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(240,187,58,0.15)',
    borderWidth: 1, borderColor: 'rgba(240,187,58,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  drawerUserLabel: { fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 2 },
  drawerUserId:    { fontSize: 13, fontWeight: '600', color: '#fff' },

  logoutBtn: {
    paddingVertical: 11, borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(240,187,58,0.3)',
    alignItems: 'center',
  },
  logoutBtnText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },

  drawerSignupBtn: {
    paddingVertical: 13, borderRadius: 8,
    backgroundColor: '#f0bb3a', alignItems: 'center',
  },
  drawerSignupText: { fontSize: 14, fontWeight: '700', color: '#0d1f3c' },
});

export default Header;
