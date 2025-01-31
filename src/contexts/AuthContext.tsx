import React, {createContext, useState, useContext, useEffect} from 'react';
import auth, {FirebaseAuthTypes} from '@react-native-firebase/auth';
import {checkIsAdmin} from '../services/auth';

interface AuthContextData {
  user: FirebaseAuthTypes.User | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async (user) => {
      setUser(user);
      if (user) {
        const adminStatus = await checkIsAdmin(user.uid);
        setIsAdmin(adminStatus);
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const {user} = await auth().signInWithEmailAndPassword(email, password);
      const adminStatus = await checkIsAdmin(user.uid);
      setIsAdmin(adminStatus);
    } catch (error) {
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await auth().signOut();
    } catch (error) {
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin,
        loading,
        signIn,
        signOut,
      }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 