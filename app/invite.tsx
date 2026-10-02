// app/invite.tsx — deep-link landing for WhatsApp invites.
// Opened via squaredsplit://invite?token=<inviteId> (from the invite Edge
// Function page). Shows who invited you and for what, then either asks you to
// sign in (stashing the token for after auth) or accepts the invite directly.

import { useLocalSearchParams, useRouter } from 'expo-router'
import React, { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { formatAmount } from '@/lib/currency'
import { acceptExpenseInvite, getInviteSummary, type InviteSummary } from '@/lib/supabase/invites'
import { useAuthStore } from '@/store/authStore'
import { useCurrencyStore } from '@/store/currencyStore'
import { usePendingInviteStore } from '@/store/pendingInviteStore'

type Phase = 'loading' | 'summary' | 'accepting' | 'accepted' | 'error'

export default function InviteScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams<{ token?: string }>()
  const token = Array.isArray(params.token) ? params.token[0] : params.token

  const session = useAuthStore(s => s.session)
  const { current: currency } = useCurrencyStore()
  const setPendingToken = usePendingInviteStore(s => s.setToken)

  const [phase, setPhase] = useState<Phase>('loading')
  const [summary, setSummary] = useState<InviteSummary | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [acceptedExpenseId, setAcceptedExpenseId] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setErrorMessage('This invite link is invalid.')
      setPhase('error')
      return
    }
    let cancelled = false
    setPhase('loading')
    void getInviteSummary(token).then(result => {
      if (cancelled) return
      if (!result) {
        setErrorMessage('This invite no longer exists.')
        setPhase('error')
        return
      }
      setSummary(result)
      setPhase('summary')
    })
    return () => {
      cancelled = true
    }
  }, [token])

  const tryAccept = useCallback(async (inviteId: string) => {
    setPhase('accepting')
    try {
      const { expenseId } = await acceptExpenseInvite(inviteId)
      setAcceptedExpenseId(expenseId)
      setPhase('accepted')
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Could not accept invite')
      setPhase('error')
    }
  }, [])

  // Signed in → accept as soon as the summary is loaded (unless already used).
  useEffect(() => {
    if (phase === 'summary' && session && token && summary?.status === 'pending') {
      void tryAccept(token)
    }
  }, [phase, session, token, summary?.status, tryAccept])

  const handleSignIn = useCallback(() => {
    if (token) setPendingToken(token)
    router.push('/login')
  }, [token, setPendingToken, router])

  const goHome = useCallback(() => {
    router.dismissAll()
    router.replace('/(tabs)')
  }, [router])

  const viewExpense = useCallback(() => {
    if (!acceptedExpenseId) return
    router.dismissAll()
    router.replace(`/dashboard/expense/${acceptedExpenseId}`)
  }, [acceptedExpenseId, router])

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12 }]}>
      <TouchableOpacity onPress={goHome} hitSlop={12} style={styles.close}>
        <Text style={styles.closeText}>✕</Text>
      </TouchableOpacity>

      {phase === 'loading' || phase === 'accepting' ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#3273CD" size="large" />
          <Text style={styles.loadingText}>
            {phase === 'accepting' ? 'Joining the expense…' : 'Loading invite…'}
          </Text>
        </View>
      ) : phase === 'error' ? (
        <View style={styles.centered}>
          <Text style={styles.emoji}>😕</Text>
          <Text style={styles.title}>Invite unavailable</Text>
          <Text style={styles.body}>{errorMessage}</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={goHome} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>Go to app</Text>
          </TouchableOpacity>
        </View>
      ) : phase === 'accepted' ? (
        <View style={styles.centered}>
          <Text style={styles.emoji}>🎉</Text>
          <Text style={styles.title}>Youu2019re in!</Text>
          <Text style={styles.body}>
            {summary?.inviter_name ?? 'Your friend'} added you to “
            {summary?.expense_title ?? 'an expense'}” — your share is{' '}
            {formatAmount(summary?.share_amount ?? 0, currency)}.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={viewExpense} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>View expense</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={goHome} activeOpacity={0.85}>
            <Text style={styles.secondaryBtnText}>Go to home</Text>
          </TouchableOpacity>
        </View>
      ) : summary && summary.status !== 'pending' ? (
        <View style={styles.centered}>
          <Text style={styles.emoji}>✅</Text>
          <Text style={styles.title}>
            {summary.status === 'accepted' ? 'Already accepted' : 'Invite unavailable'}
          </Text>
          <Text style={styles.body}>
            {summary.status === 'accepted'
              ? 'You have already accepted this invite. Open the expense from your home screen.'
              : 'This invite is no longer active.'}
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={goHome} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>Go to app</Text>
          </TouchableOpacity>
        </View>
      ) : summary ? (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.emoji}>🧾</Text>
          <Text style={styles.title}>
            {summary.inviter_name ?? 'A friend'} invited you to split
          </Text>

          <View style={styles.card}>
            <Text style={styles.expenseTitle} numberOfLines={2}>
              {summary.expense_title ?? 'Expense'}
            </Text>
            <Text style={styles.expenseAmount}>
              {formatAmount(summary.expense_amount ?? 0, currency)} total
            </Text>
            <View style={styles.divider} />
            <View style={styles.shareRow}>
              <Text style={styles.shareLabel}>Your share</Text>
              <Text style={styles.shareValue}>
                {formatAmount(summary.share_amount ?? 0, currency)}
              </Text>
            </View>
          </View>

          {session ? (
            <Text style={styles.body}>
              Signing in as a different number than {summary.invitee_phone_masked}? The invite can
              only be accepted by the invited phone.
            </Text>
          ) : (
            <Text style={styles.body}>
              Sign in with {summary.invitee_phone_masked} to accept this invite. New to
              SquaredSplit? Signing up takes under a minute.
            </Text>
          )}

          {!session && (
            <TouchableOpacity style={styles.primaryBtn} onPress={handleSignIn} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Sign in to accept</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  close: { alignSelf: 'flex-end', padding: 16 },
  closeText: { fontSize: 20, color: '#6B6B6B' },
  content: { flexGrow: 1, paddingHorizontal: 28, paddingBottom: 40 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  loadingText: { color: '#6B6B6B', fontSize: 15, fontFamily: 'Nunito_400Regular' },
  emoji: { fontSize: 48, marginBottom: 8 },
  title: {
    fontSize: 24,
    fontFamily: 'Nunito_700Bold',
    color: '#141414',
    textAlign: 'center',
    lineHeight: 32,
  },
  body: {
    fontSize: 14,
    fontFamily: 'Nunito_400Regular',
    color: '#6B6B6B',
    textAlign: 'center',
    lineHeight: 21,
    marginTop: 4,
  },
  card: {
    marginTop: 24,
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    alignItems: 'center',
  },
  expenseTitle: {
    fontSize: 20,
    fontFamily: 'Nunito_700Bold',
    color: '#141414',
    textAlign: 'center',
  },
  expenseAmount: {
    fontSize: 14,
    fontFamily: 'Nunito_500Medium',
    color: '#6B6B6B',
    marginTop: 4,
  },
  divider: { height: 1, backgroundColor: '#F3F4F5', alignSelf: 'stretch', marginVertical: 14 },
  shareRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  shareLabel: { fontSize: 14, fontFamily: 'Nunito_400Regular', color: '#6B6B6B' },
  shareValue: { fontSize: 20, fontFamily: 'Nunito_700Bold', color: '#141414' },
  primaryBtn: {
    marginTop: 20,
    height: 52,
    alignSelf: 'stretch',
    backgroundColor: '#141414',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'Nunito_600SemiBold' },
  secondaryBtn: {
    marginTop: 8,
    height: 44,
    alignSelf: 'stretch',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryBtnText: { color: '#3273CD', fontSize: 15, fontFamily: 'Nunito_600SemiBold' },
})
