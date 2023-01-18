import { Unit } from "lucid-cardano";

import {
  SAMPLE_PROTOCOL_NON_SCRIPT_PARAMS,
  getProtocolRegistry,
} from "@/commands/generate-protocol-params";
import { getLucid } from "@/commands/utils";
import {
  MIGRATE_TOKEN_NAME,
  PROTOCOL_NFT_TOKEN_NAMES,
} from "@/contracts/common/constants";
import { signAndSubmit } from "@/helpers/lucid";
import { constructAddress } from "@/helpers/schema";
import {
  ProtocolNonScriptParams,
  ProtocolParamsDatum,
  Registry,
} from "@/schema/teiki/protocol";
import { proposeProtocolProposalTx } from "@/transactions/protocol/propose";

const lucid = await getLucid();
const governorAddress = await lucid.wallet.address();

const currentProtocolNftMph =
  "a31339d3cb83e636aaf0111f4dd5926cfe952c303068eab340092071";

const proposalNftUnit: Unit =
  currentProtocolNftMph + PROTOCOL_NFT_TOKEN_NAMES.PROPOSAL;
const protocolProposalVAddress =
  "addr_test1xzs4wrjj82x0xrkrklef2ctknwt9yj8p446qudcwazkawdtdsemjlqzgnm53q4hn6efwrqxy9r2c2d2yn2qskjq6u2lqyzaz5v";

const protocolParamsUtxo = (
  await lucid.utxosByOutRef([
    {
      txHash:
        "b23a55a4f51203dacd7797655daee55fb555e8fc087a33430d9e4c00018783be",
      outputIndex: 0,
    },
  ])
)[0];

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

const proposeTeikiPlantNftMph =
  "363eda588c57b71b31842aa4c618324883de5eff2ca661abbd525352";
const proposeProtocolNftMph =
  "7c071da9e19ac65396ee53f4a35019511546f4afceb5cdcf6871819d";
const proposeMigrateTokenMph =
  "e2ceb374d3a8a49a1d05b560ba4e9e17507f12c5415c2a534a081163";
const proposeMigrateTokenName = MIGRATE_TOKEN_NAME;

const proposedRegistry: Registry = getProtocolRegistry(
  lucid,
  proposeProtocolNftMph,
  proposeTeikiPlantNftMph,
  proposeMigrateTokenMph,
  proposeMigrateTokenName
);

const proposedNonScriptParams: ProtocolNonScriptParams = {
  ...SAMPLE_PROTOCOL_NON_SCRIPT_PARAMS,
  projectPledge: 1_000_000_000n,
};

const proposedGovernorAddress = governorAddress;
const proposedStakingManagerAddress =
  "addr_test1qr96lcz9ac5ujtkwxzwgc8u276hcm5zp8u82hvgkh7spcwl6vq0xp4mj8q472g22vfpp5n3mgcxwlrm0dqd4uuch2cqqug4st7";

const proposedProtocolParamsDatum: ProtocolParamsDatum = {
  registry: proposedRegistry,
  governorAddress: constructAddress(proposedGovernorAddress),
  stakingManager: constructAddress(proposedStakingManagerAddress)
    .paymentCredential,
  ...proposedNonScriptParams,
};

const tx = proposeProtocolProposalTx(lucid, {
  protocolParamsUtxo,
  proposedProtocolParamsDatum,
  protocolProposalUtxo,
  protocolProposalRefScriptUtxo,
});

const txComplete = await tx.complete();
const txHash = await signAndSubmit(txComplete);

await lucid.awaitTx(txHash);

console.log("txHash :>> ", txHash);
