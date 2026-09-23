import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook para gerenciar o estado de ativar/desativar identificação do usuário nas mensagens
 */
export const useMessageIdentity = () => {
  const { user } = useAuth();
  const [isIdentityEnabled, setIsIdentityEnabled] = useState<boolean>(false);

  // Carregar preferência do ui_settings ou localStorage
  useEffect(() => {
    if (user?.ui_settings?.agent_name_enabled !== undefined) {
      setIsIdentityEnabled(!!user.ui_settings.agent_name_enabled);
    } else {
      const savedPreference = localStorage.getItem('agent_name_enabled');
      if (savedPreference !== null) {
        setIsIdentityEnabled(savedPreference === 'true');
      }
    }
  }, [user?.ui_settings?.agent_name_enabled]);

  // Toggle da identificação
  const toggleIdentity = useCallback(() => {
    setIsIdentityEnabled(prev => {
      const newValue = !prev;
      localStorage.setItem('agent_name_enabled', String(newValue));
      
      // Persistir no backend
      import('@/services/profile/profileService').then(({ profileService }) => {
        profileService.updateUISettings({ agent_name_enabled: newValue }).catch(err => {
          console.error('Failed to save identity preference to backend:', err);
        });
      });
      
      return newValue;
    });
  }, []);

  // Obter identificação do usuário
  const getIdentity = useCallback(() => {
    return user?.available_name || user?.display_name || user?.name || '';
  }, [user]);

  // Anexar identificação ao conteúdo da mensagem se estiver habilitada
  const prependIdentityIfEnabled = useCallback(
    (content: string) => {
      if (!isIdentityEnabled) {
        return content;
      }

      const identity = getIdentity();
      if (!identity) {
        return content;
      }

      const prefixText = `*${identity}*:\n`;

      if (content.startsWith(prefixText)) {
        return content;
      }

      const isHtml = /<[a-z][\s\S]*>/i.test(content);
      if (isHtml) {
        return `<p><strong>${identity}</strong>:</p>${content}`;
      }

      return `${prefixText}${content}`;
    },
    [isIdentityEnabled, getIdentity],
  );

  return {
    isIdentityEnabled,
    toggleIdentity,
    getIdentity,
    prependIdentityIfEnabled,
    hasIdentity: !!(user?.available_name || user?.display_name || user?.name),
  };
};
