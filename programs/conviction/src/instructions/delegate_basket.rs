//! `delegate_basket` — delegate the player's `Basket` PDA to the ER.

use anchor_lang::prelude::*;

use ephemeral_rollups_sdk::anchor::delegate;
use ephemeral_rollups_sdk::cpi::DelegateConfig;

use crate::constants::BASKET_SEED;

#[delegate]
#[derive(Accounts)]
#[instruction(match_id: u32, side: u8)]
pub struct DelegateBasket<'info> {
    pub player: Signer<'info>,
    /// CHECK: Basket PDA, delegated here.
    #[account(mut, del, seeds = [BASKET_SEED, &match_id.to_le_bytes(), player.key().as_ref()], bump)]
    pub basket: UncheckedAccount<'info>,
}

pub fn handler(ctx: Context<DelegateBasket>, match_id: u32, _side: u8) -> Result<()> {
    ctx.accounts.delegate_basket(
        &ctx.accounts.player,
        &[BASKET_SEED, &match_id.to_le_bytes(), ctx.accounts.player.key.as_ref()],
        DelegateConfig::default(),
    )?;
    Ok(())
}
