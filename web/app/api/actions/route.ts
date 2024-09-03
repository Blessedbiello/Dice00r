/**
 * Solana Dice Game
 */

import {
    ActionPostResponse,
    createPostResponse,
    ActionGetResponse,
    ActionPostRequest,
    createActionHeaders,
    ActionError,
  } from "@solana/actions";
  import {
    clusterApiUrl,
    Connection,
    Keypair,
    PublicKey,
    Transaction,
    sendAndConfirmTransaction,
  } from "@solana/web3.js";
  import {
    TOKEN_PROGRAM_ID,
    getAccount,
    createAccount,
    mintTo,
  } from "@solana/spl-token";
  import { BN } from "bn.js";
  import { randomBytes } from "crypto";
  
  // create the standard headers for this route (including CORS)
  const headers = createActionHeaders();
  
  const SEND_TOKEN_MINT = new PublicKey("SENDdRQtYMWaQrBroBrJ2Q53fgVuq95CV9UPGEvpCxa");
  
  export const GET = async (req: Request) => {
    try {
      const requestUrl = new URL(req.url);
      const { player, betAmount } = validatedQueryParams(requestUrl);
  
      const baseHref = new URL(
        `/api/actions/dice00r?player=${player.toBase58()}&betAmount=${betAmount}`,
        requestUrl.origin,
      ).toString();
  
      const payload: ActionGetResponse = {
        // type: "action",
        title: "Solana Dice00r",
        icon: new URL("/dice-game.jpg", requestUrl.origin).toString(),
        description: `Place a bet of ${betAmount} SEND tokens in the Solana dice game!`,
        label: "Place Your Bet",
        links: {
          actions: [
            {
              label: "Place 10 SEND tokens", // button text
              href: `${baseHref}&betAmount=${"10"}`,
            },
            {
              label: "Place 100 SEND tokens", // button text
              href: `${baseHref}&betAmount=${"100"}`,
            },
            {
              label: "Place 1000 SEND tokens", // button text
              href: `${baseHref}&betAmount=${"1000"}`,
            },
            {
              label: "Custom Bet", // button text
              href: `${baseHref}&betAmount={betAmount}`, // this href will have a text input
              parameters: [
                {
                  name: "betAmount", // parameter name in the `href` above
                  label: "Enter the amount of SEND tokens to bet", // placeholder of the text input
                  required: true,
                },
              ],
            },
          ],
        },
      };
  
      return Response.json(payload, {
        headers,
      });
    } catch (err) {
      console.log(err);
      const actionError: ActionError = { message: "An unknown error occurred" };
      if (typeof err == "string") actionError.message = err;
      return Response.json(actionError, {
        status: 400,
        headers,
      });
    }
  };
  
  // DO NOT FORGET TO INCLUDE THE `OPTIONS` HTTP METHOD
  // THIS WILL ENSURE CORS WORKS FOR BLINKS
  export const OPTIONS = async () => Response.json(null, { headers });
  
  export const POST = async (req: Request) => {
    try {
      const requestUrl = new URL(req.url);
      const { betAmount, player } = validatedQueryParams(requestUrl);
  
      const body: ActionPostRequest = await req.json();
  
      let account: PublicKey;
      try {
        account = new PublicKey(body.account);
      } catch (err) {
        throw 'Invalid "account" provided';
      }
  
      const connection = new Connection(
        process.env.SOLANA_RPC! || clusterApiUrl("devnet"),
      );
  
      const seed = new BN(randomBytes(16));
  
      const house = Keypair.generate();
      const playerKeypair = Keypair.generate();
  
      // Create player and house token accounts
      const playerTokenAccount = await createAccount(
        connection,
        playerKeypair,
        SEND_TOKEN_MINT,
        playerKeypair.publicKey
      );
  
      const houseTokenAccount = await createAccount(
        connection,
        house,
        SEND_TOKEN_MINT,
        house.publicKey
      );
  
      // Mint tokens to player and house
      await mintTo(
        connection,
        house,
        SEND_TOKEN_MINT,
        houseTokenAccount,
        house,
        1000000000
      );
  
      await mintTo(
        connection,
        house,
        SEND_TOKEN_MINT,
        playerTokenAccount,
        house,
        1000000000
      );
  
      const tx = new Transaction().add(
        // Example: Add your instructions for placing and resolving the bet here
        // program.methods.placeBet(seed, 50, new BN(betAmount * 1e9)).accounts({ ... }).instruction(),
        // program.methods.resolveBet(...).accounts({ ... }).instruction(),
      );
  
      tx.feePayer = player;
  
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  
      const payload: ActionPostResponse = await createPostResponse({
        fields: {
          transaction: tx,
          message: `Bet ${betAmount} SEND tokens in the dice game!`,
        },
        signers: [playerKeypair],
      });
  
      return Response.json(payload, {
        headers,
      });
    } catch (err) {
      console.log(err);
      const actionError: ActionError = { message: "An unknown error occurred" };
      if (typeof err == "string") actionError.message = err;
      return Response.json(actionError, {
        status: 400,
        headers,
      });
    }
  };
  
  function validatedQueryParams(requestUrl: URL) {
    let player: PublicKey;
    let betAmount: number;
  
    try {
      player = new PublicKey(requestUrl.searchParams.get("player")!);
    } catch (err) {
      throw "Invalid input query parameter: player";
    }
  
    try {
      betAmount = parseFloat(requestUrl.searchParams.get("betAmount")!);
      if (betAmount <= 0) throw "Bet amount is too small";
    } catch (err) {
      throw "Invalid input query parameter: betAmount";
    }
  
    return {
      player,
      betAmount,
    };
  }
  