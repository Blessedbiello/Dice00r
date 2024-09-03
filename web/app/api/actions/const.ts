import { PublicKey } from "@solana/web3.js";

// SPL token mint address for the dice game
export const DICE_GAME_TOKEN_MINT: PublicKey = new PublicKey(
  "SENDdRQtYMWaQrBroBrJ2Q53fgVuq95CV9UPGEvpCxa"
);

// Default bet amount in the dice game
export const DEFAULT_BET_AMOUNT = 10;

// Public key for the default vault or house account (replace with actual value)
export const DEFAULT_VAULT_PUBKEY: PublicKey = new PublicKey(
  "YourVaultPublicKeyHere" // Replace with your vault's public key
);
