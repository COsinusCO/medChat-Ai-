import { Stack, useLocalSearchParams } from 'expo-router';

import { CompanyProvider } from '@/features/company/company-context';

export default function CompanyLayout() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <CompanyProvider companyId={id}>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="menu" />
        <Stack.Screen name="basket" />
        <Stack.Screen name="payment" />
        <Stack.Screen name="info" />
        <Stack.Screen name="edit" />
        <Stack.Screen name="order/[orderId]" />
        <Stack.Screen name="product/[productId]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="person/[personId]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="service/[serviceId]" options={{ presentation: 'modal' }} />
      </Stack>
    </CompanyProvider>
  );
}
