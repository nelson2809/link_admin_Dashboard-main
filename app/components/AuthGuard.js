
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const AuthGuard = ({ children, requireAuth = true }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = () => {
      try {
        const token = localStorage.getItem('adminToken');
        
        if (token) {
          // Validate token structure
          const userData = JSON.parse(token);
          if (userData.email && userData.id) {
            setIsAuthenticated(true);
          } else {
            localStorage.removeItem('adminToken');
            setIsAuthenticated(false);
          }
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        localStorage.removeItem('adminToken');
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  useEffect(() => {
    if (!isLoading && isAuthenticated !== null) {
      if (requireAuth && !isAuthenticated) {
        router.replace('/login');
      } else if (!requireAuth && isAuthenticated) {
        router.replace('/dashboard');
      }
    }
  }, [isLoading, isAuthenticated, requireAuth, router]);

  // Show loading while checking authentication
  if (isLoading || isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Don't render children if auth requirements don't match
  if (requireAuth && !isAuthenticated) return null;
  if (!requireAuth && isAuthenticated) return null;

  return children;
};

export default AuthGuard;
