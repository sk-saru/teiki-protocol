import { Unit } from "lucid-cardano";

import { getLucid } from "@/commands/utils";
import { PROTOCOL_NFT_TOKEN_NAMES } from "@/contracts/common/constants";
import { signAndSubmit } from "@/helpers/lucid";
import { applyProtocolProposalTx } from "@/transactions/protocol/apply";

const lucid = await getLucid();

const protocolParamsUtxo = (
  await lucid.utxosByOutRef([
    {
      txHash:
        "b23a55a4f51203dacd7797655daee55fb555e8fc087a33430d9e4c00018783be",
      outputIndex: 0,
    },
  ])
)[0];

const currentProtocolNftMph =
  "a31339d3cb83e636aaf0111f4dd5926cfe952c303068eab340092071";

const proposalNftUnit: Unit =
  currentProtocolNftMph + PROTOCOL_NFT_TOKEN_NAMES.PROPOSAL;
const protocolProposalVAddress =
  "addr_test1xzs4wrjj82x0xrkrklef2ctknwt9yj8p446qudcwazkawdtdsemjlqzgnm53q4hn6efwrqxy9r2c2d2yn2qskjq6u2lqyzaz5v";

const protocolProposalUtxo = (
  await lucid.utxosAtWithUnit(protocolProposalVAddress, proposalNftUnit)
)[0];

const protocolProposalRefScriptUtxo = (
  await lucid.utxosByOutRef([
    {
      txHash:
        "578d8b8e21d4e0e8a4cc79a033b66afaf22819c32488d3f381e120c9caa65ad4",
      outputIndex: 0,
    },
  ])
)[0];

const protocolParamsRefScriptUtxo = (
  await lucid.utxosByOutRef([
    {
      txHash:
        "d06e34bdfe0b1a91c8a02a69114973a35bb4eac99d814caa51cd8c450fc66c33",
      outputIndex: 3,
    },
  ])
)[0];

const tx = applyProtocolProposalTx(lucid, {
  protocolParamsUtxo,
  protocolProposalUtxo,
  protocolScriptUtxos: [
    protocolParamsRefScriptUtxo,
    protocolProposalRefScriptUtxo,
  ],
});

const txComplete = await tx.complete();
const txHash = await signAndSubmit(txComplete);

await lucid.awaitTx(txHash);
console.log("txHash :>> ", txHash);
