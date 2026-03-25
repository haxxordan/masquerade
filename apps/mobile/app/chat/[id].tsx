import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  Image, KeyboardAvoidingView, Platform, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { matchesApi } from '@dating/api-client';
import { useMatchStore, useAuthStore } from '@dating/store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Message, ConversationState } from '@dating/types';
import { hubConnection } from '../../lib/hubConnection';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatSeenTime(value: string) {
  return new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({ message, isMe }: { message: Message; isMe: boolean }) {
  return (
    <View className={`flex-row mb-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
      <View
        className="max-w-[72%] px-4 py-2 rounded-2xl"
        style={{
          backgroundColor: isMe ? '#ff6699' : 'rgba(255,255,255,0.08)',
          borderBottomRightRadius: isMe ? 4 : 16,
          borderBottomLeftRadius: isMe ? 16 : 4,
        }}
      >
        <Text style={{ color: isMe ? '#000' : '#fff', fontSize: 14, lineHeight: 20 }}>
          {message.content}
        </Text>
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const { id: matchId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const userId = useAuthStore(s => s.userId);
  const {
    matches, messages, setMessages, addMessage,
    markRead, typingByMatchId, applyReadReceipt, setActiveMatch,
  } = useMatchStore();

  const match = matches.find(m => m.id === matchId);
  const other = match?.otherProfile;

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [nudging, setNudging] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [openers, setOpeners] = useState<string[]>([]);
  const [convState, setConvState] = useState<ConversationState | null>(null);

  const listRef = useRef<FlatList>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTyping = matchId ? (typingByMatchId[matchId] ?? false) : false;

  const currentMessages: Message[] = (matchId ? (messages[matchId] ?? []) : []);

  // The last message I sent that has a readAt (for read receipt display)
  const lastReadMessage = [...currentMessages]
    .reverse()
    .find(m => m.senderId === userId && m.readAt);

  // ── Track active match for unread suppression ─────────────────────────────────
  useEffect(() => {
    if (!matchId) return;
    setActiveMatch(matchId);
    return () => { setActiveMatch(null); };
  }, [matchId, setActiveMatch]);

  const refreshConversation = useCallback(async () => {
    if (!matchId) return;

    setRefreshing(true);
    try {
      const [messagesResult, openersResult, stateResult] = await Promise.allSettled([
        matchesApi.getMessages(matchId),
        matchesApi.getOpeners(matchId),
        matchesApi.getConversationState(matchId),
      ]);

      if (messagesResult.status === 'fulfilled') {
        setMessages(matchId, messagesResult.value);
        markRead(matchId);
        matchesApi.markRead(matchId).catch(() => { });
      }

      if (openersResult.status === 'fulfilled') {
        setOpeners(openersResult.value.suggestions);
      } else {
        const status = (openersResult.reason as { response?: { status?: number } })?.response?.status;
        if (status !== 404) console.warn('[chat] openers error', openersResult.reason);
        setOpeners([]);
      }

      if (stateResult.status === 'fulfilled') {
        setConvState(stateResult.value);
      } else {
        const status = (stateResult.reason as { response?: { status?: number } })?.response?.status;
        if (status !== 404) console.warn('[chat] conv state error', stateResult.reason);
        setConvState(null);
      }
    } finally {
      setRefreshing(false);
    }
  }, [markRead, matchId, setMessages]);

  useFocusEffect(useCallback(() => {
    refreshConversation().catch(() => { });
  }, [refreshConversation]));

  // ── Auto-scroll on new messages ───────────────────────────────────────────────
  useEffect(() => {
    if (currentMessages.length > 0) {
      listRef.current?.scrollToEnd({ animated: true });
    }
  }, [currentMessages.length]);

  // ── Typing broadcast ─────────────────────────────────────────────────────────
  const handleInputChange = (value: string) => {
    setInput(value);
    if (!matchId) return;
    hubConnection.current?.invoke('StartTyping', matchId).catch(() => { });
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      hubConnection.current?.invoke('StopTyping', matchId).catch(() => { });
    }, 3000);
  };

  // ── Send message ─────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!input.trim() || !matchId || sending) return;
    setSending(true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    hubConnection.current?.invoke('StopTyping', matchId).catch(() => { });
    try {
      const msg = await matchesApi.sendMessage(matchId, input.trim());
      addMessage(matchId, msg);
      setInput('');
      setOpeners([]);
      // Refresh conv state post-send
      matchesApi.getConversationState(matchId)
        .then(s => setConvState(s))
        .catch(() => { });
    } catch (err) {
      console.warn('[chat] send error', err);
    } finally {
      setSending(false);
    }
  };

  // ── Send nudge ────────────────────────────────────────────────────────────────
  const handleNudge = async () => {
    if (!matchId || nudging || !convState?.canNudge) return;
    setNudging(true);
    try {
      const result = await matchesApi.sendNudge(matchId);
      addMessage(matchId, result.message);
      setConvState(result.state);
    } catch (err) {
      console.warn('[chat] nudge error', err);
    } finally {
      setNudging(false);
    }
  };

  const renderMessage = useCallback(({ item: msg }: { item: Message }) => {
    const isMe = msg.senderId === userId;
    const showSeen = isMe && msg.id === lastReadMessage?.id && !!msg.readAt;
    return (
      <View>
        <MessageBubble message={msg} isMe={isMe} />
        {showSeen && msg.readAt && (
          <Text
            style={{ textAlign: 'right', fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: -6, marginBottom: 6, paddingRight: 4 }}
          >
            Seen {formatSeenTime(msg.readAt)}
          </Text>
        )}
      </View>
    );
  }, [userId, lastReadMessage]);

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-black"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* ── Header ── */}
      <View className="px-4 pb-3 flex-row items-center gap-3 border-b border-white/10" style={{ paddingTop: insets.top + 10 }}>
        <TouchableOpacity onPress={() => router.back()} className="px-2 py-2 -mx-2 -my-2" hitSlop={8}>
          <Text className="text-white/50 text-sm">←</Text>
        </TouchableOpacity>

        <View className="w-9 h-9 rounded overflow-hidden border border-[#ff6699] items-center justify-center flex-shrink-0">
          {other?.animalAvatarUrl ? (
            <Image source={{ uri: other.animalAvatarUrl }} className="w-full h-full" resizeMode="cover" />
          ) : (
            <Text className="text-xl">🐾</Text>
          )}
        </View>

        <View className="flex-1 min-w-0">
          <Text className="text-sm font-semibold text-white" numberOfLines={1}>
            {other?.displayName ?? 'Match'}
          </Text>
          <Text className="text-xs text-white/40" numberOfLines={1}>
            {isTyping
              ? <Text style={{ color: '#ff6699' }}>typing...</Text>
              : <Text className="capitalize">{other?.animalType ?? ''}</Text>}
          </Text>
        </View>

        {other && (
          <TouchableOpacity
            className="border border-white/20 px-3 py-1 rounded-full"
            onPress={() => router.push(`/profile/${other.id}`)}
          >
            <Text className="text-white/50 text-xs">view profile</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Messages ── */}
      <FlatList
        ref={listRef}
        data={currentMessages}
        keyExtractor={m => m.id}
        renderItem={renderMessage}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => refreshConversation().catch(() => { })}
          />
        }
        contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <Text className="text-white/20 text-center text-xs mt-8">
            You matched! Say hello 👋
          </Text>
        }
      />

      {/* ── Input area ── */}
      <View className="px-4 py-3 border-t border-white/10">
        {/* Smart opener chips (only when no messages yet) */}
        {currentMessages.length === 0 && openers.length > 0 && (
          <View className="flex-row flex-wrap mb-3">
            {openers.map(opener => (
              <TouchableOpacity
                key={opener}
                onPress={() => setInput(opener)}
                className="border border-[#ff6699]/50 mr-2 mb-2 px-3 py-1.5 rounded-full"
              >
                <Text className="text-[#ffb3ca] text-xs">{opener}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Stale / nudge banner */}
        {convState?.isStale && (
          <View className="mb-3 flex-row items-center justify-between border border-[#ff6699]/30 bg-[#ff6699]/10 rounded-xl px-3 py-2">
            <View className="flex-1 mr-3">
              <Text className="text-[10px] uppercase tracking-widest text-[#ffc2d5] mb-0.5">
                {convState.isSeenNoReply ? 'Seen, no reply yet' : 'Not seen yet'}
              </Text>
              <Text className="text-xs text-[#ffb3ca]" numberOfLines={2}>
                {convState.suggestedNudge}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleNudge}
              disabled={!convState.canNudge || nudging}
              className={`border border-[#ff6699] px-3 py-1.5 rounded-full ${(!convState.canNudge || nudging) ? 'opacity-40' : ''}`}
            >
              <Text className="text-[#ff9cbc] text-xs font-bold">
                {nudging ? 'sending...' : convState.canNudge ? 'send nudge' : 'cooling down'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Text input + send */}
        <View className="flex-row items-center gap-3">
          <TextInput
            className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-white text-sm"
            placeholder="say something..."
            placeholderTextColor="#555"
            value={input}
            onChangeText={handleInputChange}
            multiline
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!input.trim() || sending}
            className={`bg-[#ff6699] w-10 h-10 rounded-full items-center justify-center ${(!input.trim() || sending) ? 'opacity-40' : ''}`}
          >
            {sending
              ? <ActivityIndicator size="small" color="#000" />
              : <Text className="text-black font-bold text-lg">↑</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
