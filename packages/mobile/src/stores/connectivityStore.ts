import { create } from 'zustand';
import NetInfo from '@react-native-community/netinfo';
import { useEffect } from 'react';

interface ConnectivityState {
  isOnline: boolean;
  isWifiConnected: boolean;
  setOnline: (online: boolean) => void;
  setWifiConnected: (connected: boolean) => void;
}

export const useConnectivityStore = create<ConnectivityState>((set) => ({
  isOnline: true,
  isWifiConnected: true,
  setOnline: (online) => set({ isOnline: online }),
  setWifiConnected: (connected) => set({ isWifiConnected: connected }),
}));

export const useConnectivityMonitor = () => {
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isOnline = state.isConnected && state.isInternetReachable !== false;
      useConnectivityStore.setState({
        isOnline,
        isWifiConnected: state.type === 'wifi',
      });
    });

    NetInfo.fetch().then((state) => {
      const isOnline = state.isConnected && state.isInternetReachable !== false;
      useConnectivityStore.setState({
        isOnline,
        isWifiConnected: state.type === 'wifi',
      });
    });

    return () => unsubscribe();
  }, []);
};
