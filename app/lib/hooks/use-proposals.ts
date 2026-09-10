'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type Proposal, type SpectatorBet } from '@/lib/api'
import { useWalletStore } from '@/lib/store/wallet-store'

/** Governance proposals. */
export function useProposals() {
  return useQuery({
    queryKey: ['proposals'],
    queryFn: () => api.getProposals(),
  })
}

/**
 * Cast an FTR-weighted vote.
 * Invalidates on success so the tally bar reflects the new weight; the player's
 * own FTR balance is unchanged by voting, so the wallet isn't refetched.
 */
export function useVote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      proposalId,
      support,
      isPrivate,
    }: {
      proposalId: string
      support: 'yes' | 'no'
      isPrivate: boolean
    }) => api.vote(proposalId, support, isPrivate),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['proposals'] })
    },
  })
}

/** Create a proposal. Requires FTR; the UI gates on balance before calling. */
export function useCreateProposal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (p: Omit<Proposal, 'id' | 'votesYes' | 'votesNo' | 'status'>) =>
      api.createProposal(p),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['proposals'] })
    },
  })
}

/** Sealed spectator bids for a match. */
export function useSpectatorBets(matchId: string) {
  return useQuery({
    queryKey: ['bets', matchId],
    queryFn: () => api.getSpectatorBets(matchId),
    enabled: !!matchId,
  })
}

/** Place a sealed prediction. */
export function usePlaceBet(matchId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (bet: Omit<SpectatorBet, 'id' | 'bettorWallet' | 'status'>) =>
      api.placeBet(matchId, bet),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['bets', matchId] })
    },
  })
}

/** FTR balance for the connected wallet, mirrored into the wallet store. */
export function useFTRBalance() {
  const wallet = useWalletStore((s) => s.wallet)
  return useQuery({
    queryKey: ['ftr', wallet?.address],
    queryFn: () => api.getFTRBalance(wallet!.address),
    enabled: !!wallet?.address,
  })
}
