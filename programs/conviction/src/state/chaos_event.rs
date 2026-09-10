/// ChaosEvent — VRF-driven chaos event. Created on the ER; never committed
/// back to base.

use anchor_lang::prelude::*;

use crate::state::enums::ChaosKind;

#[account]
pub struct ChaosEvent {
    pub match_id: u32,
    pub sequence: u32,
    pub kind: ChaosKind,
    pub randomness: [u8; 32],
    pub fired_at_slot: u64,
    pub bump: u8,
}
impl ChaosEvent {
    pub const SIZE: usize = 8 + 4 + 4 + 1 + 32 + 8 + 1;
}
