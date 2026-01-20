import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import apiClient from "../../Context/ApiClient";
import ResponsiveContainer from "../../Components/ResponsiveContainer";
import ResponsiveText from "../../Components/ResponsiveText";
import { useResponsive } from "../../hooks/useResponsive";

type NotificationTranslations = {
  title?: string;
  short_body?: string;
  full_body?: string;
};

type NotificationMetadata = {
  entity?: {
    name?: string;
    identifier?: number | null;
  };
  settings?: {
    email?: {
      from?: string;
    };
  };
  template?: {
    variables?: Record<string, string>;
  };
  translations?: NotificationTranslations;
};

export type NotificationItem = {
  id: number;
  event_type: string;
  metadata?: NotificationMetadata;
  created_at?: string;
  status?: string;
  is_read?: boolean;
  read_at?: string | null;
};

const NotificationsScreen: React.FC = () => {
  const r = useResponsive();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    setErrorMessage(null);
    try {
      const response = await apiClient.get("/me/notifications");
      const data = Array.isArray(response.data) ? response.data : response.data?.results;
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.warn("[Notifications] Falha ao carregar:", error);
      setErrorMessage("Não foi possível carregar as notificações.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadNotifications();
    }, [loadNotifications])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadNotifications();
  }, [loadNotifications]);

  const markAsRead = useCallback(async (item: NotificationItem) => {
    if (item.is_read) return;
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, is_read: true, read_at: n.read_at || new Date().toISOString() } : n))
    );
    try {
      await apiClient.post(`/notifications/${item.id}/read`);
    } catch (error) {
      console.warn("[Notifications] Falha ao marcar como lida:", error);
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, is_read: false, read_at: null } : n))
      );
    }
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: NotificationItem }) => {
      const title = item.metadata?.translations?.title || "Notificação";
      const body = item.metadata?.translations?.short_body || "";
      const isUnread = !item.is_read;

      return (
        <TouchableOpacity
          style={[
            styles.card,
            { padding: r.spacing(1.5) },
            isUnread ? styles.cardUnread : styles.cardRead,
          ]}
          activeOpacity={0.7}
          onPress={() => markAsRead(item)}
        >
          <View style={styles.cardHeader}>
            <ResponsiveText
              variant="body"
              weight={isUnread ? "bold" : "regular"}
              style={styles.title}
            >
              {title}
            </ResponsiveText>
            {isUnread ? <View style={styles.unreadDot} /> : null}
          </View>
          {!!body && (
            <ResponsiveText variant="caption" style={styles.body}>
              {body}
            </ResponsiveText>
          )}
          {!!item.created_at && (
            <ResponsiveText variant="caption" style={styles.date}>
              {item.created_at}
            </ResponsiveText>
          )}
        </TouchableOpacity>
      );
    },
    [markAsRead, r]
  );

  const listEmpty = useMemo(() => {
    if (loading) return null;
    return (
      <View style={[styles.empty, { padding: r.spacing(2) }]}>
        <ResponsiveText variant="body" style={styles.emptyText}>
          Nenhuma notificação encontrada.
        </ResponsiveText>
      </View>
    );
  }, [loading, r]);

  return (
    <ResponsiveContainer withPadding scroll={false} style={{ backgroundColor: "#F7F9FC" }}>
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#007BFF" />
          <ResponsiveText variant="body" style={styles.loadingText}>
            Carregando notificações...
          </ResponsiveText>
        </View>
      ) : (
        <>
          {errorMessage ? (
            <View style={[styles.error, { marginBottom: r.spacing(1) }]}>
              <ResponsiveText variant="caption" style={styles.errorText}>
                {errorMessage}
              </ResponsiveText>
            </View>
          ) : null}
          <FlatList
            data={notifications}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            contentContainerStyle={[styles.listContent, { paddingBottom: r.spacing(2) }]}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            ListEmptyComponent={listEmpty}
            showsVerticalScrollIndicator={false}
          />
        </>
      )}
    </ResponsiveContainer>
  );
};

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    color: "#34495E",
  },
  listContent: {
    paddingTop: 8,
    gap: 12,
  },
  card: {
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
  },
  cardUnread: {
    borderColor: "#D6E4FF",
    shadowColor: "#4A6FA5",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  cardRead: {
    borderColor: "#EEF1F5",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    color: "#1F2D3D",
    flex: 1,
    marginRight: 8,
  },
  body: {
    color: "#4B5B6B",
    marginTop: 6,
  },
  date: {
    color: "#8A94A6",
    marginTop: 10,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#007BFF",
  },
  error: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#FDECEC",
  },
  errorText: {
    color: "#B00020",
    textAlign: "center",
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: "#7B8794",
  },
});

export default NotificationsScreen;
