import { Alert } from 'react-native';

// Surfaces an Add to Cart / Buy Now failure to the user — most importantly
// the backend's "Please complete your profile first" validation (hit by
// accounts that signed up via OTP but never filled in name/email), which
// needs an actual way forward, not just an error string.
export const showCartActionError = (error, navigation) => {
  const message = error?.message || 'Something went wrong. Please try again.';

  if (/complete your profile/i.test(message)) {
    Alert.alert(
      'Complete Your Profile',
      'Please add your name and email before adding items to cart.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Go to Profile', onPress: () => navigation.navigate('PgProfile') },
      ],
    );
    return;
  }

  Alert.alert('Error', message);
};
