use anchor_spl::token::{self, Token, TokenAccount, Mint, Transfer};
use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;

// #[derive(Accounts)]
// pub struct Initialize<'info> {
//     #[account(mut)]
//     pub house: Signer<'info>,
//     #[account(
//         init,
//         payer = house,
//         seeds = [b"vault", house.key().as_ref()],
//         bump,
//         token::mint = mint,
//         token::authority = vault,
//     )]
//     pub vault: Account<'info, TokenAccount>,
//     pub mint: Account<'info, Mint>,
//     #[account(mut)]
//     pub house_token_account: Account<'info, TokenAccount>,
//     pub token_program: Program<'info, Token>,
//     pub associated_token_program: Program<'info, AssociatedToken>,
//     pub system_program: Program<'info, System>,
//     pub rent: Sysvar<'info, Rent>,
// }
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub house: Signer<'info>,
    #[account(
        init,
        payer = house,
        seeds = [b"vault", house.key().as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = house,
    )]
    pub vault: Account<'info, TokenAccount>,
    pub token_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

impl<'info> Initialize<'info> {
    pub fn init(&mut self, amount: u64) -> Result<()> {
        let cpi_accounts = Transfer {
            from: self.house.to_account_info(),
            to: self.vault.to_account_info(),
            authority: self.house.to_account_info(),
        };
        let cpi_program = self.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        token::transfer(cpi_ctx, amount)?;

        Ok(())
    }
}

