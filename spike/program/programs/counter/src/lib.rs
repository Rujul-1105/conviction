//! Phase 0 spike — minimal counter for ER delegation + PER verification.
//!
//! Holds two PDAs:
//! - `Counter`   public, incremented on the ER
//! - `StopLoss`  PER-private commitment, members gate writes on the ER
//!
//! `spike/` is throwaway (deleted after Phase A). Keep this small.

use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};
use ephemeral_rollups_sdk::access_control::instructions::{
    CloseEphemeralPermissionCpi, CreateEphemeralPermissionCpi, UpdateEphemeralPermissionCpi,
};
use ephemeral_rollups_sdk::access_control::structs::{
    EphemeralMembersArgs, EphemeralPermission, Member, PERMISSION_SEED,
};
use ephemeral_rollups_sdk::anchor::{commit, delegate, ephemeral};
use ephemeral_rollups_sdk::consts::{EPHEMERAL_VAULT_ID, MAGIC_PROGRAM_ID, PERMISSION_PROGRAM_ID};
use ephemeral_rollups_sdk::cpi::DelegateConfig;
use ephemeral_rollups_sdk::ephem::MagicIntentBundleBuilder;

declare_id!("2Prk1oV522ED8y5tsHXXxLYfBaPVYSHLEwRoXg3At979");

pub const COUNTER_SEED: &[u8] = b"counter";
pub const STOP_LOSS_SEED: &[u8] = b"stop-loss";
pub const MAX_PERMISSION_MEMBERS: usize = 8;

#[ephemeral]
#[program]
pub mod counter {
    use super::*;

    // -----------------------------------------------------------------------
    // Counter lifecycle (public ER-routed state)
    // -----------------------------------------------------------------------

    pub fn initialize_counter(ctx: Context<InitializeCounter>) -> Result<()> {
        let counter = &mut ctx.accounts.counter;
        counter.count = 0;
        counter.authority = ctx.accounts.authority.key();
        Ok(())
    }

    pub fn delegate_counter(ctx: Context<DelegateCounter>) -> Result<()> {
        ctx.accounts.delegate_counter(
            &ctx.accounts.authority,
            &[COUNTER_SEED, ctx.accounts.authority.key().as_ref()],
            DelegateConfig::default(),
        )?;
        Ok(())
    }

    /// Increment on the ER. Public so any wallet can press it during the spike;
    /// the real game in Phase A narrows this to one permissioned player.
    pub fn bump(ctx: Context<Bump>) -> Result<()> {
        require!(
            ctx.accounts.counter.authority == ctx.accounts.payer.key(),
            CounterError::NotAuthority
        );
        ctx.accounts.counter.count = ctx.accounts.counter.count.checked_add(1).unwrap();
        Ok(())
    }

    pub fn commit_counter(ctx: Context<CommitCounter>) -> Result<()> {
        MagicIntentBundleBuilder::new(
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.magic_context.to_account_info(),
            ctx.accounts.magic_program.to_account_info(),
        )
        .commit(&[ctx.accounts.counter.to_account_info()])
        .build_and_invoke()?;
        Ok(())
    }

    pub fn undelegate_counter(ctx: Context<UndelegateCounter>) -> Result<()> {
        MagicIntentBundleBuilder::new(
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.magic_context.to_account_info(),
            ctx.accounts.magic_program.to_account_info(),
        )
        .commit_and_undelegate(&[ctx.accounts.counter.to_account_info()])
        .build_and_invoke()?;
        Ok(())
    }

    // -----------------------------------------------------------------------
    // StopLoss (PER-private). Pre-fund, delegate, then manage permission on ER.
    // -----------------------------------------------------------------------

    pub fn initialize_stop_loss(
        ctx: Context<InitializeStopLoss>,
        max_loss_bps: u16,
    ) -> Result<()> {
        let stop_loss = &mut ctx.accounts.stop_loss;
        stop_loss.authority = ctx.accounts.authority.key();
        // Range packed into two u16 bounds; the real Phase A StopLoss stores
        // the actual commitment hash, but for the spike we keep it observable.
        stop_loss.min_bps = max_loss_bps.saturating_sub(100);
        stop_loss.max_bps = max_loss_bps.saturating_add(100);

        // Pre-fund the data PDA for permission rent on the ER.
        let rent = ephemeral_rollups_sdk::ephemeral_accounts::rent(
            EphemeralPermission::size_of(MAX_PERMISSION_MEMBERS) as u32,
        );
        transfer(
            CpiContext::new(
                ctx.accounts.system_program.key(),
                Transfer {
                    from: ctx.accounts.authority.to_account_info(),
                    to: stop_loss.to_account_info(),
                },
            ),
            rent,
        )?;
        Ok(())
    }

    pub fn delegate_stop_loss(ctx: Context<DelegateStopLoss>) -> Result<()> {
        let _ = &ctx.accounts.stop_loss;
        ctx.accounts.delegate_stop_loss(
            &ctx.accounts.authority,
            &[STOP_LOSS_SEED, ctx.accounts.authority.key().as_ref()],
            DelegateConfig::default(),
        )?;
        Ok(())
    }

    pub fn init_stop_loss_permission(
        ctx: Context<StopLossPermissionContext>,
        members: Vec<MemberArg>,
    ) -> Result<()> {
        require!(
            members.len() <= MAX_PERMISSION_MEMBERS,
            CounterError::TooManyMembers
        );
        let members_sdk: Vec<Member> = members
            .into_iter()
            .map(|m| Member { pubkey: m.pubkey, flags: m.flags })
            .collect();

        // Idempotent: skip when permission already initialized.
        if ctx.accounts.permission.owner == &PERMISSION_PROGRAM_ID
            && !ctx.accounts.permission.data_is_empty()
        {
            return Ok(());
        }

        let signer_seeds: &[&[u8]] = &[
            STOP_LOSS_SEED,
            ctx.accounts.stop_loss.authority.as_ref(),
            &[ctx.bumps.stop_loss],
        ];

        CreateEphemeralPermissionCpi {
            payer: ctx.accounts.stop_loss.to_account_info(),
            permissioned_account: ctx.accounts.stop_loss.to_account_info(),
            permission: ctx.accounts.permission.to_account_info(),
            vault: ctx.accounts.ephemeral_vault.to_account_info(),
            magic_program: ctx.accounts.magic_program.to_account_info(),
            permission_program: ctx.accounts.permission_program.to_account_info(),
            args: EphemeralMembersArgs {
                is_private: true,
                members: members_sdk,
            },
        }
        .invoke_signed(&[signer_seeds])?;
        Ok(())
    }

    pub fn update_stop_loss_permission(
        ctx: Context<StopLossPermissionContext>,
        members: Vec<MemberArg>,
    ) -> Result<()> {
        require!(
            members.len() <= MAX_PERMISSION_MEMBERS,
            CounterError::TooManyMembers
        );
        let members_sdk: Vec<Member> = members
            .into_iter()
            .map(|m| Member { pubkey: m.pubkey, flags: m.flags })
            .collect();

        let signer_seeds: &[&[u8]] = &[
            STOP_LOSS_SEED,
            ctx.accounts.stop_loss.authority.as_ref(),
            &[ctx.bumps.stop_loss],
        ];

        UpdateEphemeralPermissionCpi {
            payer: ctx.accounts.stop_loss.to_account_info(),
            permissioned_account: ctx.accounts.stop_loss.to_account_info(),
            permission: ctx.accounts.permission.to_account_info(),
            vault: ctx.accounts.ephemeral_vault.to_account_info(),
            magic_program: ctx.accounts.magic_program.to_account_info(),
            permission_program: ctx.accounts.permission_program.to_account_info(),
            authority: ctx.accounts.stop_loss.to_account_info(),
            authority_is_signer: false,
            args: EphemeralMembersArgs {
                is_private: true,
                members: members_sdk,
            },
        }
        .invoke_signed(&[signer_seeds])?;
        Ok(())
    }

    pub fn close_stop_loss_permission(
        ctx: Context<StopLossPermissionContext>,
    ) -> Result<()> {
        let signer_seeds: &[&[u8]] = &[
            STOP_LOSS_SEED,
            ctx.accounts.stop_loss.authority.as_ref(),
            &[ctx.bumps.stop_loss],
        ];

        CloseEphemeralPermissionCpi {
            payer: ctx.accounts.stop_loss.to_account_info(),
            permissioned_account: ctx.accounts.stop_loss.to_account_info(),
            permission: ctx.accounts.permission.to_account_info(),
            vault: ctx.accounts.ephemeral_vault.to_account_info(),
            magic_program: ctx.accounts.magic_program.to_account_info(),
            permission_program: ctx.accounts.permission_program.to_account_info(),
            authority: ctx.accounts.stop_loss.to_account_info(),
            authority_is_signer: false,
        }
        .invoke_signed(&[signer_seeds])?;
        Ok(())
    }

    pub fn undelegate_stop_loss(ctx: Context<UndelegateStopLoss>) -> Result<()> {
        MagicIntentBundleBuilder::new(
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.magic_context.to_account_info(),
            ctx.accounts.magic_program.to_account_info(),
        )
        .commit_and_undelegate(&[ctx.accounts.stop_loss.to_account_info()])
        .build_and_invoke()?;
        Ok(())
    }
}

// ===========================================================================
// State
// ===========================================================================

#[account]
pub struct Counter {
    pub authority: Pubkey,
    pub count: u64,
}
impl Counter {
    pub const SIZE: usize = 8 + 32 + 8;
}

#[account]
pub struct StopLoss {
    pub authority: Pubkey,
    pub min_bps: u16,
    pub max_bps: u16,
}
impl StopLoss {
    pub const SIZE: usize = 8 + 32 + 2 + 2;
}

// Lightweight args struct to keep the IDL readable on the TS side.
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct MemberArg {
    pub pubkey: Pubkey,
    pub flags: u8,
}

impl From<MemberArg> for ephemeral_rollups_sdk::access_control::structs::Member {
    fn from(m: MemberArg) -> Self {
        Self {
            pubkey: m.pubkey,
            flags: m.flags,
        }
    }
}

// ===========================================================================
// Contexts
// ===========================================================================

#[derive(Accounts)]
pub struct InitializeCounter<'info> {
    #[account(
        init,
        payer = authority,
        space = Counter::SIZE,
        seeds = [COUNTER_SEED, authority.key().as_ref()],
        bump,
    )]
    pub counter: Account<'info, Counter>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[delegate]
#[derive(Accounts)]
pub struct DelegateCounter<'info> {
    pub authority: Signer<'info>,
    /// CHECK: PDA to delegate.
    #[account(
        mut,
        del,
        seeds = [COUNTER_SEED, authority.key().as_ref()],
        bump,
    )]
    pub counter: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct Bump<'info> {
    #[account(
        mut,
        seeds = [COUNTER_SEED, counter.authority.as_ref()],
        bump,
        has_one = authority,
    )]
    pub counter: Account<'info, Counter>,
    pub authority: Signer<'info>,
    /// CHECK: Fee payer. May equal authority or be a delegated payer's wallet.
    #[account(mut)]
    pub payer: AccountInfo<'info>,
}

#[commit]
#[derive(Accounts)]
pub struct CommitCounter<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, seeds = [COUNTER_SEED, counter.authority.as_ref()], bump)]
    pub counter: Account<'info, Counter>,
}

#[commit]
#[derive(Accounts)]
pub struct UndelegateCounter<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, seeds = [COUNTER_SEED, counter.authority.as_ref()], bump)]
    pub counter: Account<'info, Counter>,
}

#[derive(Accounts)]
pub struct InitializeStopLoss<'info> {
    #[account(
        init,
        payer = authority,
        space = StopLoss::SIZE,
        seeds = [STOP_LOSS_SEED, authority.key().as_ref()],
        bump,
    )]
    pub stop_loss: Account<'info, StopLoss>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[delegate]
#[derive(Accounts)]
pub struct DelegateStopLoss<'info> {
    pub authority: Signer<'info>,
    /// CHECK: PDA to delegate.
    #[account(
        mut,
        del,
        seeds = [STOP_LOSS_SEED, authority.key().as_ref()],
        bump,
    )]
    pub stop_loss: AccountInfo<'info>,
}

#[commit]
#[derive(Accounts)]
pub struct UndelegateStopLoss<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, seeds = [STOP_LOSS_SEED, stop_loss.authority.as_ref()], bump)]
    pub stop_loss: Account<'info, StopLoss>,
}

#[derive(Accounts)]
pub struct StopLossPermissionContext<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [STOP_LOSS_SEED, stop_loss.authority.as_ref()],
        has_one = authority,
        bump,
    )]
    pub stop_loss: Account<'info, StopLoss>,
    /// CHECK: Derived under the Permission Program; permission program enforces ownership.
    #[account(
        mut,
        seeds = [
            PERMISSION_SEED,
            stop_loss.key().as_ref(),
        ],
        bump,
        seeds::program = permission_program.key(),
    )]
    pub permission: AccountInfo<'info>,
    /// CHECK: Permission Program id.
    #[account(address = PERMISSION_PROGRAM_ID)]
    pub permission_program: AccountInfo<'info>,
    /// CHECK: Ephemeral vault that holds rented lamports.
    #[account(mut, address = EPHEMERAL_VAULT_ID)]
    pub ephemeral_vault: AccountInfo<'info>,
    /// CHECK: Magic program id.
    #[account(address = MAGIC_PROGRAM_ID)]
    pub magic_program: AccountInfo<'info>,
}

// ===========================================================================
// Errors
// ===========================================================================

#[error_code]
pub enum CounterError {
    #[msg("Signer is not the counter authority")]
    NotAuthority,
    #[msg("Permission member count exceeds MAX_PERMISSION_MEMBERS")]
    TooManyMembers,
}
