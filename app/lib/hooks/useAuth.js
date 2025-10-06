'use client';
import { useState, useEffect, createContext, useContext } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      const token = localStorage.getItem('adminToken');
      
      if (token) {
        try {
          const userData = JSON.parse(token);
          setUser(userData);
        } catch (error) {
          localStorage.removeItem('adminToken');
        }
      }
      setLoading(false);
    }
  }, [mounted]);

  const signIn = async (email, password) => {
    try {
      const adminAuthRef = collection(db, 'admin_auth');
      const q = query(
        adminAuthRef,
        where('email', '==', email),
        where('password', '==', password)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const userData = { id: userDoc.id, ...userDoc.data() };
        
        const sessionData = {
          id: userData.id,
          email: userData.email,
          loginTime: new Date().toISOString()
        };
        
        localStorage.setItem('adminToken', JSON.stringify(sessionData));
        setUser(sessionData);
        
        return userData;
      } else {
        throw new Error('Invalid credentials');
      }
    } catch (error) {
      throw error;
    }
  };

  const signOut = async () => {
    try {
      localStorage.removeItem('adminToken');
      setUser(null);
    } catch (error) {
      throw error;
    }
  };

  const value = {
    user,
    loading: loading || !mounted,
    signIn,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};
