import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

export const signIn = async (email: string, password: string) => {
  try {
    const userCredential = await auth().signInWithEmailAndPassword(email, password);
    // Check if user is admin
    const adminDoc = await firestore()
      .collection('admins')
      .doc(userCredential.user.uid)
      .get();
    
    return {
      user: userCredential.user,
      isAdmin: adminDoc.exists
    };
  } catch (error) {
    throw error;
  }
};

export const signOut = async () => {
  try {
    await auth().signOut();
  } catch (error) {
    throw error;
  }
};

export const getCurrentUser = () => {
  return auth().currentUser;
};

export const checkIsAdmin = async (uid: string) => {
  try {
    const adminDoc = await firestore()
      .collection('admins')
      .doc(uid)
      .get();
    return adminDoc.exists;
  } catch (error) {
    return false;
  }
}; 