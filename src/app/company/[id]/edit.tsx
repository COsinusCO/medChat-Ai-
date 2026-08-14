import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CompanyStackHeader } from '@/components/company/stack-header';
import { ThemedText } from '@/components/themed-text';
import { CompanyRadius, Spacing } from '@/constants/theme';
import { useCompany } from '@/features/company/company-context';
import { useI18n } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';
import { submitCompanyUpdateRequest } from '@/services/edit-company-service';

export default function EditCompanyScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { companyId, company } = useCompany();

  const [name, setName] = useState(company?.name ?? '');
  const [address, setAddress] = useState(company?.full_address || company?.address || '');
  const [phone, setPhone] = useState(company?.phone_number ?? '');
  const [website, setWebsite] = useState(company?.website ?? '');
  const [email, setEmail] = useState(company?.email ?? '');
  const [telegram, setTelegram] = useState(company?.social_media?.telegram ?? '');
  const [instagram, setInstagram] = useState(company?.social_media?.instagram ?? '');
  const [whatsapp, setWhatsapp] = useState(company?.social_media?.whatsApp ?? '');
  const [facebook, setFacebook] = useState(company?.social_media?.facebook ?? '');
  const [requesterName, setRequesterName] = useState(company?.requester_name ?? '');
  const [requesterPhone, setRequesterPhone] = useState(company?.requester_phone_number ?? '');
  const [position, setPosition] = useState(company?.requester_position ?? '');
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!requesterName.trim() || !requesterPhone.trim() || !position.trim()) {
      Alert.alert(t('requiredFields'));
      return;
    }
    setSending(true);
    try {
      await submitCompanyUpdateRequest(companyId, {
        ...company,
        name,
        full_address: address,
        phone_number: phone,
        website,
        email,
        social_media: {
          telegram,
          instagram,
          whatsApp: whatsapp,
          facebook,
        },
        requester_name: requesterName.trim(),
        requester_phone_number: requesterPhone.trim(),
        requester_position: position.trim(),
      });
      Alert.alert(t('successfullyUpdated'));
      router.back();
    } catch {
      Alert.alert(t('updateError'));
    } finally {
      setSending(false);
    }
  };

  const field = (label: string, value: string, onChange: (v: string) => void, extra?: object) => (
    <View style={styles.field}>
      <ThemedText type="caption" themeColor="hint">
        {label}
      </ThemedText>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholderTextColor={theme.hint}
        style={[styles.input, { color: theme.text, backgroundColor: theme.fill }]}
        {...extra}
      />
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: theme.pageBackground }]}>
      <CompanyStackHeader title={t('editCompany')} subtitle={company?.name} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: Spacing.three, paddingBottom: insets.bottom + 40 }}>
        <ThemedText type="heading">{t('generalInfo')}</ThemedText>
        {field(t('companyNameField'), name, setName)}
        {field(t('addressField'), address, setAddress)}

        <ThemedText type="heading" style={styles.block}>
          {t('contactsSection')}
        </ThemedText>
        {field(t('phoneNumber'), phone, setPhone, { keyboardType: 'phone-pad' })}
        {field(t('websiteField'), website, setWebsite)}
        {field(t('emailField'), email, setEmail, { keyboardType: 'email-address' })}
        {field(t('telegramLink'), telegram, setTelegram)}
        {field(t('instagramLink'), instagram, setInstagram)}
        {field(t('whatsappNumber'), whatsapp, setWhatsapp, { keyboardType: 'phone-pad' })}
        {field(t('facebookLink'), facebook, setFacebook)}

        <ThemedText type="heading" style={styles.block}>
          {t('yourPosition')}
        </ThemedText>
        {field(t('requesterName'), requesterName, setRequesterName)}
        {field(t('requesterPhone'), requesterPhone, setRequesterPhone, { keyboardType: 'phone-pad' })}
        {field(t('requesterPosition'), position, setPosition)}

        <Pressable
          disabled={sending}
          onPress={submit}
          style={[styles.cta, { backgroundColor: theme.buttonColor }, sending && { opacity: 0.6 }]}>
          <ThemedText style={{ color: theme.buttonTextColor, fontWeight: '600', textAlign: 'center' }}>{t('sendRequest')}</ThemedText>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  block: { marginTop: Spacing.four },
  field: { marginTop: Spacing.two, gap: 4 },
  input: { borderRadius: CompanyRadius.button, padding: Spacing.three, fontSize: 16 },
  cta: {
    marginTop: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingVertical: 15,
    borderRadius: CompanyRadius.button,
  },
});
