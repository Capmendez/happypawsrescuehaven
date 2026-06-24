import React, { useEffect } from 'react';
import { supabase } from '../../lib/supabase';

// Module-level guard to prevent multiple script injections across re-renders
let isScriptInjected = false;

export const LiveChatWidget: React.FC = () => {
  useEffect(() => {
    const initLiveChat = async () => {
      // Check if script is already in DOM or already injected
      if (isScriptInjected || document.querySelector('script[src*="embed.tawk.to"]')) {
        return;
      }

      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('*')
          .in('key', ['tawkto_property_id', 'tawkto_widget_id', 'tawkto_enabled']);

        if (error) throw error;

        let propertyId = '';
        let widgetId = '';
        let enabled = false;

        if (data) {
          data.forEach((row: any) => {
            if (row.key === 'tawkto_property_id') propertyId = (row.value || '').trim();
            if (row.key === 'tawkto_widget_id') widgetId = (row.value || '').trim();
            if (row.key === 'tawkto_enabled') enabled = (row.value || '').trim().toLowerCase() === 'true';
          });
        }

        // Only inject if enabled and both IDs are present
        if (enabled && propertyId && widgetId) {
          isScriptInjected = true;

          // Initialize Tawk_API and load timestamp
          (window as any).Tawk_API = (window as any).Tawk_API || {};
          (window as any).Tawk_LoadStart = new Date();

          const s1 = document.createElement("script");
          const s0 = document.getElementsByTagName("script")[0];
          s1.async = true;
          s1.src = `https://embed.tawk.to/${propertyId}/${widgetId}`;
          s1.charset = 'UTF-8';
          s1.setAttribute('crossorigin', '*');

          if (s0 && s0.parentNode) {
            s0.parentNode.insertBefore(s1, s0);
          } else {
            document.head.appendChild(s1);
          }
        }
      } catch (err) {
        console.error('Error loading Tawk.to live chat settings:', err);
      }
    };

    initLiveChat();
  }, []);

  return null; // Renders outside the React DOM tree
};

export default LiveChatWidget;
