//! `init_basket_permission` — initialize PER on the ER-side `Basket` PDA.
//!
//! Closes Phase 0 debt #1: enforces that the player is in the recorded
//! `per_members` set, even on devnet's non-TEE ER.

use anchor_lang::prelude::*;

use ephemeral_rollups_sdk::access_control::instructions::CreateEphemeralPermissionCpi;
use ephemeral_rollups_sdk::access_control::structs::{EphemeralMembersArgs, Member};
use ephemeral_rollups_sdk::consts::{EPHEMERAL_VAULT_ID, MAGIC_PROGRAM_ID};

use crate::constants::BASKET_SEED;
use ephemeral_rollups_sdk::access_control::structs::PERMISSION_SEED;
use crate::helpers::{require_member_of, require_members_within_cap};
use crate::state::Basket;

#[derive(Accounts)]
pub struct InitBasketPermission<'info> {
    pub player: Signer<'info>,
    #[account(seeds = [BASKET_SEED, basket.key().as_ref()], bump)]
    pub basket: Account<'info, Basket>,
    /// CHECK: PER permission PDA; owned by PERMISSION_PROGRAM after init.
    #[account(mut, seeds = [PERMISSION_SEED, basket.key().as_ref()], bump, seeds::program = permission_program.key())]
    pub permission: UncheckedAccount<'info>,
    /// CHECK: ephemeral vault receiving the rent.
    #[account(mut, address = EPHEMERAL_VAULT_ID)]
    pub ephemeral_vault: UncheckedAccount<'info>,
    /// CHECK: Magic program id.
    #[account(address = MAGIC_PROGRAM_ID)]
    pub magic_program: UncheckedAccount<'info>,
    /// CHECK: Permission program id.
    pub permission_program: UncheckedAccount<'info>,
}

pub fn handler(ctx: Context<InitBasketPermission>) -> Result<()> {
    let basket = &ctx.accounts.basket;
    let player = basket.player;
    let members = basket.per_members;
    let flags = basket.per_flags;
    require_members_within_cap(
        members.iter().filter(|m| *m != &Pubkey::default()).count(),
    )?;
    let player_key = ctx.accounts.player.key();
    require_member_of(player_key, &members)?;

    let data_seeds: &[&[u8]] = &[
        BASKET_SEED,
        player.as_ref(),
        &[ctx.bumps.basket],
    ];
    let members_sdk: Vec<Member> = members
        .iter()
        .zip(flags.iter())
        .filter(|(m, _)| *m != &Pubkey::default())
        .map(|(m, f)| Member { pubkey: *m, flags: *f })
        .collect();
    CreateEphemeralPermissionCpi {
        payer: ctx.accounts.basket.to_account_info(),
        permissioned_account: ctx.accounts.basket.to_account_info(),
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
