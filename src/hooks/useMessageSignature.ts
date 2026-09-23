import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook para gerenciar o estado de ativar/desativar assinatura de mensagens
 * Similar ao useUISettings do Vue
 */
export const useMessageSignature = () => {
  const { user } = useAuth();
  const [isSignatureEnabled, setIsSignatureEnabled] = useState<boolean>(false);

  // Carregar preferência do ui_settings ou localStorage
  useEffect(() => {
    if (user?.ui_settings?.message_signature_enabled !== undefined) {
      setIsSignatureEnabled(!!user.ui_settings.message_signature_enabled);
    } else {
      const savedPreference = localStorage.getItem('message_signature_enabled');
      if (savedPreference !== null) {
        setIsSignatureEnabled(savedPreference === 'true');
      }
    }
  }, [user?.ui_settings?.message_signature_enabled]);

  // Toggle da assinatura
  const toggleSignature = useCallback(() => {
    setIsSignatureEnabled(prev => {
      const newValue = !prev;
      localStorage.setItem('message_signature_enabled', String(newValue));
      
      // Persistir no backend
      import('@/services/profile/profileService').then(({ profileService }) => {
        profileService.updateUISettings({ message_signature_enabled: newValue }).catch(err => {
          console.error('Failed to save signature preference to backend:', err);
        });
      });
      
      return newValue;
    });
  }, []);

  // Obter assinatura do usuário
  const getSignature = useCallback(() => {
    const signature = user?.message_signature || '';
    return signature;
  }, [user]);

  // Anexar assinatura ao conteúdo da mensagem se estiver habilitada
  const appendSignatureIfEnabled = useCallback(
    (content: string) => {
      if (!isSignatureEnabled) {
        return content;
      }

      const signature = getSignature();
      if (!signature) {
        return content;
      }

      if (content.trim().endsWith(signature.trim())) {
        return content;
      }

      const isHtml = /<[a-z][\s\S]*>/i.test(content);
      if (isHtml) {
        return `${content}<p><br></p><p>${signature}</p>`;
      }

      return `${content}\n\n${signature}`;
    },
    [isSignatureEnabled, getSignature],
  );

  return {
    isSignatureEnabled,
    toggleSignature,
    getSignature,
    appendSignatureIfEnabled,
    hasSignature: !!user?.message_signature,
  };
};
