import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { CollapseMore } from '@/components/company/collapse-more';
import { RatingStars } from '@/components/company/rating-stars';
import { ThemedText } from '@/components/themed-text';
import { CompanyRadius, Radius, Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';
import { fetchCompanyComments } from '@/services/company-service';
import type { CompanyComment } from '@/types/chat';
import { mediaUrl } from '@/utils/media-url';
import { timeAgo } from '@/utils/photos';

/** `useState(3)` in the web — three comments per page. */
const PAGE = 3;

const DEFAULT_AVATAR =
  'https://dev.admin13.uz/images/truegis-default-images/default-avatar.png';

/** `FeedBack` — the venue's reviews, three at a time behind a "Read more" pill. */
export function Feedback({
  companyId,
  /** Changing this refetches — the composer bumps it after a review is posted. */
  reloadToken = 0,
}: {
  companyId: string;
  reloadToken?: number;
}) {
  const theme = useTheme();
  const { t } = useI18n();

  const [comments, setComments] = useState<CompanyComment[]>([]);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(PAGE);
  /** The page size the loaded `comments` belong to — a mismatch means a fetch is in flight. */
  const [loadedLimit, setLoadedLimit] = useState(0);

  useEffect(() => {
    if (!companyId) return;

    const controller = new AbortController();

    fetchCompanyComments(companyId, limit, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setComments(result.comments);
        setTotal(result.total);
        setLoadedLimit(limit);
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoadedLimit(limit);
      });

    return () => controller.abort();
  }, [companyId, limit, reloadToken]);

  const loading = loadedLimit !== limit;

  if (!total) return null;

  const expanded = limit > PAGE;

  return (
    <View style={styles.container}>
      {comments.map((comment, index) => (
        <Comment key={comment._id} comment={comment} last={index === comments.length - 1} />
      ))}

      {total > PAGE && (
        <Pressable
          accessibilityRole="button"
          onPress={() => setLimit(expanded && limit >= total ? PAGE : limit + PAGE)}
          style={({ pressed }) => [
            styles.more,
            { backgroundColor: theme.fill },
            pressed && styles.pressed,
          ]}>
          <ThemedText style={styles.moreText}>
            {loading ? t('loading') : limit >= total ? t('collapse') : t('readMore')}
          </ThemedText>
        </Pressable>
      )}
    </View>
  );
}

function Comment({ comment, last }: { comment: CompanyComment; last: boolean }) {
  const theme = useTheme();
  const { t } = useI18n();

  const avatar = mediaUrl(comment.user?.telegram_profile_photo?.image) || DEFAULT_AVATAR;

  return (
    <View style={[styles.comment, !last && { borderBottomColor: theme.separatorStrong, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <View style={styles.commentHeader}>
        <Image source={{ uri: avatar }} style={styles.avatar} contentFit="cover" />

        <View style={styles.commentAuthor}>
          <ThemedText style={styles.authorName}>{comment.user?.telegram_name}</ThemedText>
          <RatingStars count={comment.rating} size={15} gap={1} />
        </View>

        <View style={styles.commentMeta}>
          <ThemedText style={[styles.ago, { color: theme.hint }]}>
            {timeAgo(comment.created_at, t)}
          </ThemedText>
          {comment.status === 'pending' && (
            <ThemedText style={[styles.ago, { color: theme.hint }]}>{t('pending')}</ThemedText>
          )}
        </View>
      </View>

      {!!comment.images?.length && (
        <View style={styles.images}>
          {comment.images.map((uri) => (
            <Image key={uri} source={{ uri }} style={styles.image} contentFit="cover" />
          ))}
        </View>
      )}

      <CollapseMore text={comment.message} maxLength={90} textStyle={styles.message} />

      {comment.replies?.map((reply) => (
        <View key={reply.reply_id} style={[styles.reply, { borderLeftColor: theme.hint }]}>
          <View style={styles.commentHeader}>
            <Image source={{ uri: DEFAULT_AVATAR }} style={styles.avatar} contentFit="cover" />

            <View style={styles.commentAuthor}>
              <ThemedText style={styles.authorName}>
                {reply.reply_from === 'root' ? t('truegisTeam') : t('owner')}
              </ThemedText>
            </View>

            <View style={styles.commentMeta}>
              <SymbolView
                name={{
                  ios: 'arrow.uturn.left',
                  android: 'reply',
                  web: 'reply',
                }}
                size={14}
                tintColor={theme.hint}
              />
              <ThemedText style={[styles.ago, { color: theme.hint }]}>
                {timeAgo(reply.reply_date, t)}
              </ThemedText>
            </View>
          </View>

          <CollapseMore text={reply.message} maxLength={90} textStyle={styles.message} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
    borderRadius: CompanyRadius.card,
  },
  comment: {
    paddingBottom: Spacing.two,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: Radius.pill,
  },
  commentAuthor: {
    flex: 1,
    gap: 2,
  },
  authorName: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
    letterSpacing: -0.28,
  },
  commentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  ago: {
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: -0.28,
    textAlign: 'right',
  },
  images: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 25,
    marginVertical: Spacing.three,
  },
  image: {
    width: 70,
    height: 70,
    borderRadius: CompanyRadius.button,
  },
  message: {
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.32,
  },
  reply: {
    paddingLeft: 15,
    marginTop: Spacing.two,
    borderLeftWidth: 1,
    borderRadius: 5,
    opacity: 0.9,
  },
  more: {
    alignSelf: 'center',
    borderRadius: CompanyRadius.inner,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    marginTop: Spacing.two,
  },
  moreText: {
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.13,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
