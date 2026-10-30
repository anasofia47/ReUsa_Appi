import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/providers/auth-provider';

export default function TabsLayout() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { user } = useAuth();
  const isSupervisor = user?.role === 'supervisor' || user?.role === 'admin';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Catálogo',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: isSupervisor ? 'Gestión' : 'Solicitudes',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="swap-horizontal-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="publish"
        options={{
          title: 'Donar',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notificaciones',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="loans"
        options={{
          href: null, // Oculto de la barra visual, disponible para rutas de prueba
        }}
      />
    </Tabs>
  );
}
