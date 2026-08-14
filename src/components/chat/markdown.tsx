/**
 * Compact markdown renderer for assistant replies.
 *
 * Covers what the model actually emits — headings, lists, quotes, fenced code, bold/italic,
 * inline code and links — rather than pulling a full CommonMark implementation into the bundle.
 */
import * as Clipboard from 'expo-clipboard';
import { openURL } from 'expo-linking';
import { memo, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Block =
  | { kind: 'paragraph'; text: string }
  | { kind: 'heading'; text: string; level: number }
  | { kind: 'bullet'; text: string }
  | { kind: 'ordered'; text: string; marker: string }
  | { kind: 'quote'; text: string }
  | { kind: 'code'; text: string; language?: string }
  | { kind: 'rule' };

type Token =
  | { kind: 'text'; text: string }
  | { kind: 'bold'; text: string }
  | { kind: 'italic'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'link'; text: string; href: string };

const INLINE_PATTERN =
  /(\*\*[^*]+\*\*|__[^_]+__|\*[^*\n]+\*|_[^_\n]+_|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;

export function parseBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    blocks.push({ kind: 'paragraph', text: paragraph.join(' ').trim() });
    paragraph = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fence = line.match(/^\s*```(\w+)?\s*$/);

    if (fence) {
      flushParagraph();
      const code: string[] = [];
      i += 1;
      while (i < lines.length && !/^\s*```/.test(lines[i])) {
        code.push(lines[i]);
        i += 1;
      }
      blocks.push({ kind: 'code', text: code.join('\n'), language: fence[1] });
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      continue;
    }
    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
      flushParagraph();
      blocks.push({ kind: 'rule' });
      continue;
    }

    const heading = line.match(/^\s*(#{1,4})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      blocks.push({ kind: 'heading', level: heading[1].length, text: heading[2].trim() });
      continue;
    }

    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    if (bullet) {
      flushParagraph();
      blocks.push({ kind: 'bullet', text: bullet[1].trim() });
      continue;
    }

    const ordered = line.match(/^\s*(\d+)[.)]\s+(.*)$/);
    if (ordered) {
      flushParagraph();
      blocks.push({ kind: 'ordered', marker: `${ordered[1]}.`, text: ordered[2].trim() });
      continue;
    }

    const quote = line.match(/^\s*>\s?(.*)$/);
    if (quote) {
      flushParagraph();
      blocks.push({ kind: 'quote', text: quote[1].trim() });
      continue;
    }

    paragraph.push(line.trim());
  }

  flushParagraph();
  return blocks;
}

export function parseInline(text: string): Token[] {
  const tokens: Token[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(INLINE_PATTERN)) {
    const value = match[0];
    const index = match.index ?? 0;

    if (index > lastIndex) tokens.push({ kind: 'text', text: text.slice(lastIndex, index) });
    lastIndex = index + value.length;

    if (value.startsWith('**') || value.startsWith('__')) {
      tokens.push({ kind: 'bold', text: value.slice(2, -2) });
    } else if (value.startsWith('`')) {
      tokens.push({ kind: 'code', text: value.slice(1, -1) });
    } else if (value.startsWith('[')) {
      const link = value.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
      if (link) tokens.push({ kind: 'link', text: link[1], href: link[2] });
    } else {
      tokens.push({ kind: 'italic', text: value.slice(1, -1) });
    }
  }

  if (lastIndex < text.length) tokens.push({ kind: 'text', text: text.slice(lastIndex) });
  return tokens;
}

function InlineText({ text, color }: { text: string; color?: string }) {
  const theme = useTheme();
  const tokens = useMemo(() => parseInline(text), [text]);

  return (
    <ThemedText style={color ? { color } : undefined}>
      {tokens.map((token, index) => {
        if (token.kind === 'bold') {
          return (
            <Text key={index} style={styles.bold}>
              {token.text}
            </Text>
          );
        }
        if (token.kind === 'italic') {
          return (
            <Text key={index} style={styles.italic}>
              {token.text}
            </Text>
          );
        }
        if (token.kind === 'code') {
          return (
            <Text key={index} style={[styles.inlineCode, { backgroundColor: theme.backgroundSelected }]}>
              {` ${token.text} `}
            </Text>
          );
        }
        if (token.kind === 'link') {
          return (
            <Text
              key={index}
              style={[styles.link, { color: theme.primary }]}
              onPress={() => openURL(token.href).catch(() => {})}>
              {token.text}
            </Text>
          );
        }
        return <Text key={index}>{token.text}</Text>;
      })}
    </ThemedText>
  );
}

function CodeBlock({ code, language }: { code: string; language?: string }) {
  const theme = useTheme();

  return (
    <View style={[styles.codeBlock, { backgroundColor: theme.backgroundSelected }]}>
      <View style={styles.codeHeader}>
        <ThemedText type="caption" themeColor="textMuted">
          {language ?? 'code'}
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          onPress={() => Clipboard.setStringAsync(code).catch(() => {})}
          hitSlop={8}>
          <ThemedText type="caption" themeColor="primary">
            copy
          </ThemedText>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <ThemedText type="small" style={styles.codeText}>
          {code}
        </ThemedText>
      </ScrollView>
    </View>
  );
}

export const Markdown = memo(function Markdown({ text, color }: { text: string; color?: string }) {
  const theme = useTheme();
  const blocks = useMemo(() => parseBlocks(text), [text]);

  return (
    <View style={styles.container}>
      {blocks.map((block, index) => {
        switch (block.kind) {
          case 'heading':
            return (
              <ThemedText
                key={index}
                type={block.level <= 2 ? 'heading' : 'bodyStrong'}
                style={color ? { color } : undefined}>
                {block.text}
              </ThemedText>
            );
          case 'bullet':
            return (
              <View key={index} style={styles.listRow}>
                <ThemedText style={[styles.marker, color ? { color } : null]}>•</ThemedText>
                <View style={styles.listBody}>
                  <InlineText text={block.text} color={color} />
                </View>
              </View>
            );
          case 'ordered':
            return (
              <View key={index} style={styles.listRow}>
                <ThemedText style={[styles.marker, color ? { color } : null]}>
                  {block.marker}
                </ThemedText>
                <View style={styles.listBody}>
                  <InlineText text={block.text} color={color} />
                </View>
              </View>
            );
          case 'quote':
            return (
              <View key={index} style={[styles.quote, { borderLeftColor: theme.primary }]}>
                <InlineText text={block.text} color={color ?? theme.textSecondary} />
              </View>
            );
          case 'code':
            return <CodeBlock key={index} code={block.text} language={block.language} />;
          case 'rule':
            return <View key={index} style={[styles.rule, { backgroundColor: theme.separator }]} />;
          default:
            return <InlineText key={index} text={block.text} color={color} />;
        }
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  bold: {
    fontWeight: '700',
  },
  italic: {
    fontStyle: 'italic',
  },
  inlineCode: {
    fontSize: 14,
    borderRadius: Radius.small,
  },
  link: {
    textDecorationLine: 'underline',
  },
  listRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  marker: {
    minWidth: 18,
  },
  listBody: {
    flex: 1,
  },
  quote: {
    borderLeftWidth: 3,
    paddingLeft: Spacing.two,
  },
  codeBlock: {
    borderRadius: Radius.medium,
    padding: Spacing.two,
    gap: Spacing.one,
  },
  codeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  codeText: {
    fontFamily: 'monospace',
  },
  rule: {
    height: StyleSheet.hairlineWidth,
  },
});
