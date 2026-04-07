/**
 * TOKEN VERIFICATION TEST
 * Add this to any screen to verify token is present in Redux
 */

import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { useSelector } from 'react-redux';
import { selectAccessToken, selectUserId } from '../store/authSlice';

const TokenDebugger = () => {
  const token = useSelector(selectAccessToken);
  const userId = useSelector(selectUserId);

  useEffect(() => {
    console.log('=== TOKEN DEBUG ===');
    console.log('Token exists:', !!token);
    console.log('Token value:', token ? `***${token.slice(-8)}` : 'MISSING');
    console.log('User ID:', userId);
    console.log('==================');
  }, [token, userId]);

  return (
    <View style={{ padding: 10, backgroundColor: '#f0f0f0', margin: 10, borderRadius: 5 }}>
      <Text style={{ fontSize: 12, fontWeight: 'bold' }}>Token Debug:</Text>
      <Text style={{ fontSize: 10 }}>
        Token: {token ? `Present (***${token.slice(-8)})` : 'MISSING'}
      </Text>
      <Text style={{ fontSize: 10 }}>User ID: {userId || 'MISSING'}</Text>
    </View>
  );
};

export default TokenDebugger;

/**
 * USAGE:
 * 
 * import TokenDebugger from './TokenDebugger';
 * 
 * const MyScreen = () => {
 *   return (
 *     <View>
 *       <TokenDebugger />
 *       // ... rest of your screen
 *     </View>
 *   );
 * };
 */
