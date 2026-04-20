import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { selectUserId } from '../store/authSlice';
import { fetchWallet, fetchTransactions, fetchProfile, clearAuthTokens } from '../services/goldApi';
import { SESSION_EXPIRED } from '../constants/authConstants';
import { API_GOLD_BUY_PRICE, API_GOLD_SELL_PRICE } from '../constants/api';

const GoldContext = createContext(null);

// Constants
const DEFAULT_PRICE = 6500; // Default gold price per gram in INR
const TIMEOUT_MS = 10000;   // 10 seconds timeout
const REFRESH_MS = 60000;   // Refresh every 60 seconds (reduced from 30s)

const BUY_API     = API_GOLD_BUY_PRICE;
const SELL_API    = API_GOLD_SELL_PRICE;
const fetchWithTimeout = (url) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS);
    fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } })
      .then(r => { clearTimeout(t); resolve(r); })
      .catch(e => { clearTimeout(t); reject(e); });
  });

const initialState = {
  goldPrice:  { pricePerGram: DEFAULT_PRICE, sellPrice: DEFAULT_PRICE, lastUpdated: null },
  portfolio:  { totalGrams: 0, totalInvested: 0, currentValue: 0, transactions: [] },
  user:       { id: null, name: '', email: '', phone: '', kycVerified: false, walletBalance: 0 },
  userId:     null,
  loading:    false,
  priceError: null,
  dataReady:  false,
};

const reducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':    return { ...state, loading: action.payload };
    case 'SET_GOLD_PRICE': return { ...state, goldPrice: action.payload, loading: false, priceError: null };
    case 'SET_PRICE_ERROR':return { ...state, priceError: action.payload, loading: false };
    case 'SET_PORTFOLIO':  return { ...state, portfolio: action.payload };
    case 'SET_USER':       return { ...state, user: action.payload };
    case 'SET_USER_ID':    return { ...state, userId: action.payload };
    case 'SET_DATA_READY': return { ...state, dataReady: true };
    case 'LOGOUT':         return { ...initialState };
    case 'ADD_TRANSACTION': {
      const txn   = action.payload;
      const isBuy = txn.type === 'BUY';
      return {
        ...state,
        portfolio: {
          ...state.portfolio,
          totalGrams:    parseFloat((state.portfolio.totalGrams + (isBuy ? txn.grams : -txn.grams)).toFixed(4)),
          totalInvested: parseFloat((state.portfolio.totalInvested + (isBuy ? txn.amount : -txn.amount)).toFixed(2)),
          transactions:  [txn, ...state.portfolio.transactions],
        },
        user: {
          ...state.user,
          walletBalance: parseFloat((state.user.walletBalance + (isBuy ? -txn.amount : txn.amount)).toFixed(2)),
        },
      };
    }
    case 'ADD_WALLET_FUNDS':
      return { ...state, user: { ...state.user, walletBalance: state.user.walletBalance + action.payload } };
    default:
      return state;
  }
};

export const GoldProvider = ({ children, navigationRef }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const reduxUserId = useSelector(selectUserId);

  // ── Handle session expiry ─────────────────────────────────────────────────
  const handleSessionExpired = useCallback(async () => {
    await clearAuthTokens();
    dispatch({ type: 'LOGOUT' });
    if (navigationRef?.current) {
      navigationRef.current.reset({ index: 0, routes: [{ name: 'Login' }] });
    }
  }, [navigationRef]);

  // ── Refresh live gold price ───────────────────────────────────────────────
  const refreshPrice = useCallback(async () => {
    try {
      const [buyRes, sellRes] = await Promise.all([
        fetchWithTimeout(BUY_API),
        fetchWithTimeout(SELL_API),
      ]);
      const buyData  = await buyRes.json();
      const sellData = await sellRes.json();

      const buyObj  = Array.isArray(buyData?.data)  ? buyData?.data?.[0]  : buyData?.data;
      const sellObj = Array.isArray(sellData?.data) ? sellData?.data?.[0] : sellData?.data;

      const buyPrice  = parseFloat(buyObj?.preTaxAmount);
      const sellPrice = parseFloat(sellObj?.preTaxAmount);

      dispatch({
        type: 'SET_GOLD_PRICE',
        payload: {
          pricePerGram: !isNaN(buyPrice)  ? buyPrice  : DEFAULT_PRICE,
          sellPrice:    !isNaN(sellPrice) ? sellPrice : DEFAULT_PRICE,
          lastUpdated:  new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        },
      });
    } catch {
      dispatch({ type: 'SET_PRICE_ERROR', payload: 'Unable to fetch gold price' });
    }
  }, []);

  // ── Load user profile + wallet + transactions ─────────────────────────────
  const loadUserData = useCallback(async () => {
    const userId = reduxUserId;
    if (!userId) return;

    dispatch({ type: 'SET_USER_ID', payload: userId });

    try {
      const [profile, wallet, transactions] = await Promise.allSettled([
        fetchProfile(userId),
        fetchWallet(userId),
        fetchTransactions(userId),
      ]);

      if (profile.status === 'fulfilled') {
        dispatch({ type: 'SET_USER', payload: profile.value });
      } else if (profile.reason?.message === SESSION_EXPIRED) {
        return handleSessionExpired();
      }

      if (wallet.status === 'fulfilled') {
        const w = wallet.value;
        dispatch({
          type: 'SET_PORTFOLIO',
          payload: {
            totalGrams:    w.goldBalanceGrams,
            totalInvested: w.totalInvestedAmount,
            currentValue:  w.currentValue,
            walletBalance: w.walletBalance,
            transactions:  transactions.status === 'fulfilled' ? transactions.value : [],
          },
        });
        dispatch({
          type: 'SET_USER',
          payload: {
            ...(profile.status === 'fulfilled' ? profile.value : state.user),
            walletBalance: w.walletBalance,
          },
        });
      } else if (wallet.reason?.message === SESSION_EXPIRED) {
        return handleSessionExpired();
      } else if (transactions.status === 'fulfilled') {
        dispatch({
          type: 'SET_PORTFOLIO',
          payload: { ...state.portfolio, transactions: transactions.value },
        });
      }

      dispatch({ type: 'SET_DATA_READY' });
    } catch {}
  }, [reduxUserId, handleSessionExpired]);

  // ── Add transaction (optimistic update) ──────────────────────────────────
  const addTransaction = useCallback(async (txn) => {
    dispatch({ type: 'ADD_TRANSACTION', payload: txn });
    setTimeout(() => { refreshPrice(); loadUserData(); }, 2000);
  }, [refreshPrice, loadUserData]);

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    await clearAuthTokens();
    dispatch({ type: 'LOGOUT' });
  }, []);

  // ── Boot + reload when userId changes (after login) ───────────────────────
  useEffect(() => {
    refreshPrice();
    loadUserData();
    const timer = setInterval(() => {
      refreshPrice();
      loadUserData();
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [refreshPrice, loadUserData]);

  return (
    <GoldContext.Provider value={{ state, dispatch, refreshPrice, loadUserData, addTransaction, logout }}>
      {children}
    </GoldContext.Provider>
  );
};

export const useGold = () => useContext(GoldContext);
