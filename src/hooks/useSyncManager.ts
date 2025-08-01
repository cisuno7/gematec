import { useEffect, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';
import { SyncService } from '../Services/SyncService';

export const useSyncManager = () => {
    const appState = useRef(AppState.currentState);

    useEffect(() => {
        // Listener para o estado da conexão
        const unsubscribeNetInfo = NetInfo.addEventListener(state => {
            if (state.isConnected) {
                console.log('[useSyncManager] Dispositivo online, iniciando sincronização.');
                SyncService.syncPendingRequests();
            }
        });

        // Listener para o estado do app (ativo/background)
        const subscription = AppState.addEventListener('change', nextAppState => {
            // Sincroniza quando o app volta para o estado ativo
            if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
                console.log('[useSyncManager] App tornou-se ativo, iniciando sincronização.');
                SyncService.syncPendingRequests();
            }
            appState.current = nextAppState;
        });

        // Sincronização inicial ao montar o hook
        console.log('[useSyncManager] Hook montado, realizando sincronização inicial.');
        SyncService.syncPendingRequests();

        // Limpeza ao desmontar
        return () => {
            unsubscribeNetInfo();
            subscription.remove();
        };
    }, []);
};
