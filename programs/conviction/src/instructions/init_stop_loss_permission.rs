//! `init_stop_loss_permission` — initialize PER on the ER-side `StopLoss` PDA.

use anchor_lang::prelude::*;

use ephemeral_rollups_sdk::access_control::instructions::CreateEphemeralPermissionCpi;
use ephemeral_rollups_sdk::access_control::structs::{EphemeralMembersArgs, Member};
use ephemeral_rollups_sdk::consts::{EPHEMERAL_VAULT_ID, MAGIC_PROGRAM_ID};

use crate::constants::STOP_LOSS_SEED;
use crate::helpers::require_member_of;
use crate::state::StopLoss;
use ephemeral_rollups_sdk::access_control::structs::PERMISSION_SEED;

#[derive(Accounts)]
pub struct InitStopLossPermission<'info> {
    pub player: Signer<'info>,
    #[account(seeds = [STOP_LOSS_SEED, stop_loss.key().as_ref()], bump)]
    pub stop_loss: Account<'info, StopLoss>,
    /// CHECK: PER permission PDA.
    #[account(mut, seeds = [PERMISSION_SEED, stop_loss.key().as_ref()], bump, seeds::program = permission_program.key())]
    pub permission: UncheckedAccount<'info>,
    /// CHECK: ephemeral vault.
    #[account(mut, address = EPHEMERAL_VAULT_ID)]
    pub ephemeral_vault: UncheckedAccount<'info>,
    /// CHECK: magic program.
    #[account(address = MAGIC_PROGRAM_ID)]
    pub magic_program: UncheckedAccount<'info>,
    /// CHECK: permission program.
    pub permission_program: UncheckedAccount<'info>,
}

pub fn handler(ctx: Context<InitStopLossPermission>) -> Result<()> {
    let stop_loss = &ctx.accounts.stop_loss;
    let player = stop_loss.player;
    let members = stop_loss.per_members;
    let flags = stop_loss.per_flags;
    let player_key = ctx.accounts.player.key();
    require_member_of(player_key, &members)?;

    let data_seeds: &[&[u8]] = &[STOP_LOSS_SEED, player.as_ref(), &[ctx.bumps.stop_loss]];
    let members_sdk: Vec<Member> = members
        .iter()
        .zip(flags.iter())
        .filter(|(m, _)| *m != &Pubkey::default())
        .map(|(m, f)| Member {
            pubkey: *m,
            flags: *f,
        })
        .collect();
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
    .invoke_signed(&[data_seeds])?;
    Ok(())
}
