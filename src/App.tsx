import React, { useState, useEffect } from 'react';
import { LoginForm } from './components/auth/LoginForm';
import { RegisterForm } from './components/auth/RegisterForm';
import { AdminDashboard } from './components/dashboard/AdminDashboard';
import { UserDashboard } from './components/dashboard/UserDashboard';
import { Button } from './components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { WelcomeBackToast } from './components/ui/welcome-back-toast';
import { LogOut, Users, ClipboardList } from 'lucide-react';
import { supabase } from './utils/supabase/client';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLogin, setIsLogin] = useState(true);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const [isRestoredSession, setIsRestoredSession] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // Check for existing session with enhanced error handling
    const checkSession = async () => {
      try {
        console.log('Verificando sesión existente...');
        
        // First, try to get the current session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error checking session:', error);
          // If there's an error, try to refresh the session
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError) {
            console.error('Error refreshing session:', refreshError);
          } else if (refreshData.session?.user && isMounted) {
            console.log('Sesión refrescada exitosamente');
            setUser(refreshData.session.user);
            setIsRestoredSession(true);
          }
        } else if (session?.user && isMounted) {
          console.log('Sesión existente encontrada:', session.user.email);
          setUser(session.user);
          setIsRestoredSession(true);
        } else {
          console.log('No se encontró sesión existente');
        }
      } catch (error) {
        console.error('Error durante la verificación de sesión:', error);
        // Clear any corrupted session data
        try {
          await supabase.auth.signOut();
        } catch (signOutError) {
          console.error('Error limpiando sesión corrupta:', signOutError);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          setSessionChecked(true);
        }
      }
    };

    checkSession();

    // Listen for auth changes with enhanced handling
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email || 'No user');
        
        if (isMounted) {
          if (session?.user) {
            setUser(session.user);
            
            // Store additional user info in localStorage for faster loading
            try {
              localStorage.setItem('userLastActive', new Date().toISOString());
              localStorage.setItem('userRole', session.user.user_metadata?.role || 'user');
            } catch (error) {
              console.warn('Could not save user info to localStorage:', error);
            }
          } else {
            setUser(null);
            
            // Clear stored user info
            try {
              localStorage.removeItem('userLastActive');
              localStorage.removeItem('userRole');
            } catch (error) {
              console.warn('Could not clear user info from localStorage:', error);
            }
          }
          
          if (sessionChecked) {
            setLoading(false);
          }
        }
      }
    );

    // Cleanup function
    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [sessionChecked]);

  // Show welcome back toast only once per session when session is restored
  useEffect(() => {
    if (user && isRestoredSession && !showWelcomeBack) {
      // Check if we've already shown the welcome message for this session
      const lastWelcomeShown = localStorage.getItem('lastWelcomeShown');
      const now = new Date().toISOString().split('T')[0]; // Current date (YYYY-MM-DD)
      
      // Only show if we haven't shown it today or if it's been more than 6 hours
      const shouldShow = !lastWelcomeShown || lastWelcomeShown !== now;
      
      if (shouldShow) {
        setShowWelcomeBack(true);
        // Mark that we've shown the welcome message today
        localStorage.setItem('lastWelcomeShown', now);
      }
    }
  }, [user, isRestoredSession, showWelcomeBack]);

  const handleLogout = async () => {
    try {
      console.log('Cerrando sesión...');
      setLoading(true);
      
      // Clear local storage
      try {
        localStorage.removeItem('userLastActive');
        localStorage.removeItem('userRole');
      } catch (error) {
        console.warn('Could not clear localStorage:', error);
      }
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
      } else {
        console.log('Sesión cerrada exitosamente');
      }
      
      setUser(null);
      setIsRestoredSession(false);
      setShowWelcomeBack(false);
    } catch (error) {
      console.error('Error durante el cierre de sesión:', error);
    } finally {
      setLoading(false);
    }
  };

  const onAuthSuccess = (userData) => {
    console.log('Login exitoso:', userData.email);
    setUser(userData);
    setIsRestoredSession(false); // This is a fresh login, not a restored session
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="flex flex-col items-center space-y-4 max-w-sm w-full">
          <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 text-center text-lg sm:text-xl">
            {sessionChecked ? 'Cargando...' : 'Verificando sesión...'}
          </p>
          <p className="text-sm text-gray-500 text-center">
            Restaurando tu sesión automáticamente
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-gray-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md xl:max-w-lg 2xl:max-w-xl">
          <div className="bg-white rounded-xl shadow-2xl p-6 sm:p-8 lg:p-10">
            <div className="text-center mb-6 sm:mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-[#00A63E] rounded-full mb-4 sm:mb-6">
                <ClipboardList className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-white" />
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-gray-900 mb-2 sm:mb-4">
                Sistema de Gestión de Actividades
              </h1>
              <p className="text-sm sm:text-base lg:text-lg text-gray-600">
                Honorable Concejo Deliberante - Posadas, Misiones
              </p>
            </div>

            <Tabs value={isLogin ? "login" : "register"} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 h-12 lg:h-14">
                <TabsTrigger 
                  value="login" 
                  onClick={() => setIsLogin(true)}
                  className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-sm lg:text-base"
                >
                  Iniciar Sesión
                </TabsTrigger>
                <TabsTrigger 
                  value="register" 
                  onClick={() => setIsLogin(false)}
                  className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-sm lg:text-base"
                >
                  Registrarse
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <LoginForm onSuccess={onAuthSuccess} />
              </TabsContent>
              
              <TabsContent value="register">
                <RegisterForm onSuccess={onAuthSuccess} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = user?.user_metadata?.role === 'admin';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Welcome Back Toast */}
      {showWelcomeBack && (
        <WelcomeBackToast 
          user={user} 
          onDismiss={() => setShowWelcomeBack(false)} 
        />
      )}

      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
          <div className="flex justify-between items-center h-16 lg:h-20">
            <div className="flex items-center space-x-3 sm:space-x-4 lg:space-x-6 min-w-0 flex-1">
              <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 xl:w-14 xl:h-14 bg-[#00A63E] rounded-lg flex items-center justify-center flex-shrink-0">
                <ClipboardList className="w-4 h-4 sm:w-6 sm:h-6 lg:w-7 lg:h-7 xl:w-8 xl:h-8 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-base sm:text-lg lg:text-xl xl:text-2xl font-semibold text-gray-900 truncate">
                  Gestión de Actividades
                </h1>

              </div>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-3 lg:space-x-4 xl:space-x-6 flex-shrink-0">
              <div className="hidden sm:flex items-center space-x-2 lg:space-x-3 xl:space-x-4">
                <div className={`w-3 h-3 lg:w-4 lg:h-4 rounded-full ${isAdmin ? 'bg-blue-500' : 'bg-green-500'}`}></div>
                <span className="text-sm lg:text-base text-gray-600 hidden md:inline max-w-32 lg:max-w-48 xl:max-w-64 truncate">
                  {user.user_metadata?.name || user.email}
                </span>
                <span className={`px-2 py-1 lg:px-3 lg:py-1.5 text-xs lg:text-sm rounded-full ${
                  isAdmin 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  {isAdmin ? 'Admin' : 'Usuario'}
                </span>
              </div>
              
              <Button 
                variant="outline" 
                size={window.innerWidth >= 1024 ? "default" : "sm"}
                onClick={handleLogout}
                className="flex items-center space-x-1 sm:space-x-2 lg:h-10 xl:h-12"
              >
                <LogOut className="w-4 h-4 lg:w-5 lg:h-5" />
                <span className="hidden sm:inline text-sm lg:text-base">Salir</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-4 sm:py-6 lg:py-8 xl:py-12">
        <div className="w-full">
          {isAdmin ? (
            <AdminDashboard user={user} />
          ) : (
            <UserDashboard user={user} />
          )}
        </div>
      </main>
    </div>
  );
}