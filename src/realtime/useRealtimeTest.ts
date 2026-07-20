// Phase 0 — Test hook to verify Supabase Realtime connection
import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export type ConnectionStatus = 'connecting' | 'connected' | 'error';

/**
 * Subscribes to a test Supabase Realtime channel and reports connection status.
 * Cleans up on unmount per the realtime skill rules.
 */
export function useRealtimeTest(): ConnectionStatus {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');

  useEffect(() => {
    const channel = supabase.channel('test-connection', {
      config: { broadcast: { self: false } },
    });

    channel.subscribe((subscriptionStatus) => {
      if (subscriptionStatus === 'SUBSCRIBED') {
        console.log('✅ Supabase Realtime connected');
        setStatus('connected');
      } else if (subscriptionStatus === 'CHANNEL_ERROR') {
        console.error('❌ Supabase Realtime connection failed');
        setStatus('error');
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return status;
}
