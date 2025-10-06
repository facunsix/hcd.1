import React, { useEffect, useState } from 'react';
import { CheckCircle, User } from 'lucide-react';

interface WelcomeBackToastProps {
  user: any;
  onDismiss: () => void;
}

export function WelcomeBackToast({ user, onDismiss }: WelcomeBackToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onDismiss, 300); // Wait for animation to complete
    }, 4000); // Increased to 4 seconds for better UX

    return () => clearTimeout(timer);
  }, [onDismiss]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(onDismiss, 300);
  };

  if (!isVisible) {
    return null;
  }

  const isAdmin = user?.user_metadata?.role === 'admin';

  return (
    <div className={`fixed top-4 right-4 sm:top-6 sm:right-6 lg:top-8 lg:right-8 z-50 transition-all duration-300 ${
      isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
    }`}>
      <div className="bg-white shadow-xl rounded-xl border border-gray-200 p-4 sm:p-5 lg:p-6 max-w-sm lg:max-w-md xl:max-w-lg">
        <div className="flex items-start space-x-3 sm:space-x-4">
          <div className={`w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-full flex items-center justify-center flex-shrink-0 ${
            isAdmin ? 'bg-blue-100' : 'bg-green-100'
          }`}>
            <User className={`w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 ${isAdmin ? 'text-blue-600' : 'text-green-600'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
              <p className="text-sm sm:text-base lg:text-lg font-medium text-gray-900">
                ¡Bienvenido de vuelta!
              </p>
            </div>
            <p className="text-xs sm:text-sm lg:text-base text-gray-600 mt-1 truncate">
              {user.user_metadata?.name || user.email}
            </p>
            <p className={`text-xs sm:text-sm mt-1 ${isAdmin ? 'text-blue-600' : 'text-green-600'}`}>
              Sesión restaurada automáticamente
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-md"
            aria-label="Cerrar notificación"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}