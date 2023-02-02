import { Unit } from "lucid-cardano";

import { getLucid } from "@/commands/utils";
import { PROTOCOL_NFT_TOKEN_NAMES } from "@/contracts/common/constants";
import { signAndSubmit } from "@/helpers/lucid";
import { applyProtocolProposalTx } from "@/transactions/protocol/apply";

const lucid = await getLucid();

const currentProtocolNftMph =
  "6637245986b10d6cc16a813548e38e899a4896209eec413b65556a6d";

const protocolParamsUtxo = (
  await lucid.utxosByOutRef([
    {
      txHash:
        "6328d95ba23381ac375dc9ad062e560e338bbe069a9333f98ef6099777a7fd26",
      outputIndex: 1,
    },
  ])
)[0];

const proposalNftUnit: Unit =
  currentProtocolNftMph + PROTOCOL_NFT_TOKEN_NAMES.PROPOSAL;
const protocolProposalVAddress =
  "addr_test1xzm4xa24l0wpnqqsrspjqwhesudrvecac023tugaceettcsfp4affk9mx059een5mvadnt9c427mt4a2muxhmp0slkksem9aux";

const protocolProposalUtxo = (
  await lucid.utxosAtWithUnit(protocolProposalVAddress, proposalNftUnit)
)[0];
const protocolProposalRefScriptUtxo = (
  await lucid.utxosByOutRef([
    {
      txHash:
        "37cc30bdf97495dab5d32831d35229757b15ef92d5604cb69d8aa700bfeadcfb",
      outputIndex: 4,
    },
  ])
)[0];

const protocolParamsRefScriptUtxo = (
  await lucid.utxosByOutRef([
    {
      txHash:
        "37cc30bdf97495dab5d32831d35229757b15ef92d5604cb69d8aa700bfeadcfb",
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
  txTimePadding: 60000,
});

const txComplete = await tx.complete({ nativeUplc: false });
const txHash = await signAndSubmit(txComplete);

await lucid.awaitTx(txHash);
console.log("txHash :>> ", txHash);
