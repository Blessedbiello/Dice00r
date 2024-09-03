import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { DiceGame } from "../target/types/dice_game";
import { 
  Transaction, 
  Ed25519Program, 
  Keypair, 
  PublicKey, 
  LAMPORTS_PER_SOL, 
  SYSVAR_INSTRUCTIONS_PUBKEY, 
  sendAndConfirmTransaction 
} from "@solana/web3.js";
import { 
  TOKEN_PROGRAM_ID, 
  createAccount, 
  mintTo, 
  getAccount 
} from "@solana/spl-token";
import { randomBytes } from "crypto";
import { BN } from "bn.js";

describe("dice-game", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.DiceGame as Program<DiceGame>;

  const house = Keypair.generate();
  const player = Keypair.generate();
  const seed = new BN(randomBytes(16));
  
  const SEND_TOKEN_MINT = new PublicKey("SENDdRQtYMWaQrBroBrJ2Q53fgVuq95CV9UPGEvpCxa");
  
  let vault: PublicKey;
  let bet: PublicKey;
  let houseTokenAccount: PublicKey;
  let playerTokenAccount: PublicKey;

  before(async () => {
    // Airdrop SOL to house and player
    await Promise.all([house, player].map(async (k) => {
      const signature = await provider.connection.requestAirdrop(k.publicKey, 1000 * LAMPORTS_PER_SOL);
      await confirmTx(signature);
    }));

    // Setup token accounts
    houseTokenAccount = await createAccount(
      provider.connection,
      house,
      SEND_TOKEN_MINT,
      house.publicKey
    );

    playerTokenAccount = await createAccount(
      provider.connection,
      player,
      SEND_TOKEN_MINT,
      player.publicKey
    );

    // Mint some tokens to house and player
    await mintTo(
      provider.connection,
      house,
      SEND_TOKEN_MINT,
      houseTokenAccount,
      house,
      1000000000 // 1000 SEND tokens (assuming 9 decimals)
    );

    await mintTo(
      provider.connection,
      house,
      SEND_TOKEN_MINT,
      playerTokenAccount,
      house,
      1000000000 // 1000 SEND tokens (assuming 9 decimals)
    );

    // Find PDAs
    [vault] = PublicKey.findProgramAddressSync([Buffer.from("vault"), house.publicKey.toBuffer()], program.programId);
    [bet] = PublicKey.findProgramAddressSync([Buffer.from("bet"), vault.toBuffer(), seed.toBuffer("le", 16)], program.programId);
  });

  it("Initialize", async () => {
    const tx = await program.methods.initialize(new BN(1000000000)) // 1000 SEND tokens
      .accounts({
        house: house.publicKey,
        vault,
        tokenMint: SEND_TOKEN_MINT,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([house])
      .rpc();
    await confirmTx(tx);
  });

  it("Place a bet", async () => {
    const tx = await program.methods.placeBet(seed, 50, new BN(10000000)) // 10 SEND tokens
      .accounts({
        player: player.publicKey,
        house: house.publicKey,
        vault,
        bet,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([player])
      .rpc();
    await confirmTx(tx);
  });

  it("Resolve a bet", async () => {
    const account = await provider.connection.getAccountInfo(bet, "confirmed");
    if (!account) throw new Error("Bet account not found");

    const sig_ix = Ed25519Program.createInstructionWithPrivateKey({
      privateKey: house.secretKey,
      message: account.data.subarray(8)
    });

    const resolve_ix = await program.methods.resolveBet(Buffer.from(sig_ix.data.buffer.slice(16+32, 16+32+64)))
      .accounts({
        player: player.publicKey,
        house: house.publicKey,
        vault,
        bet,
        instructionSysvar: SYSVAR_INSTRUCTIONS_PUBKEY,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([house])
      .instruction();

    const tx = new Transaction().add(sig_ix).add(resolve_ix);

    try {
      await sendAndConfirmTransaction(
        provider.connection,
        tx,
        [house]
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  });

  it("Check balances", async () => {
    const vaultAccount = await getAccount(provider.connection, vault);
    const playerAccount = await getAccount(provider.connection, playerTokenAccount);
    console.log("Vault balance:", vaultAccount.amount.toString());
    console.log("Player balance:", playerAccount.amount.toString());
  });
});

const confirmTx = async (signature: string): Promise<string> => {
  const latestBlockhash = await anchor.getProvider().connection.getLatestBlockhash();
  await anchor.getProvider().connection.confirmTransaction(
    {
      signature,
      ...latestBlockhash,
    },
    "confirmed"
  );
  return signature;
};