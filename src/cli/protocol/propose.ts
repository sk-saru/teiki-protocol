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
import {
  constructAddress,
  constructAssetClass,
  constructMigratableScript,
} from "@/helpers/schema";
import * as S from "@/schema";
import { ProtocolParamsDatum, Registry } from "@/schema/teiki/protocol";
import { proposeProtocolProposalTx } from "@/transactions/protocol/propose";
import { assert } from "@/utils";

const lucid = await getLucid();
const governorAddress = await lucid.wallet.address();

const currentProtocolNftMph =
  "6637245986b10d6cc16a813548e38e899a4896209eec413b65556a6d";
const currentTeikiPlantNftMph =
  "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";

const proposalNftUnit: Unit =
  currentProtocolNftMph + PROTOCOL_NFT_TOKEN_NAMES.PROPOSAL;
const protocolProposalVAddress =
  "addr_test1xzm4xa24l0wpnqqsrspjqwhesudrvecac023tugaceettcsfp4affk9mx059een5mvadnt9c427mt4a2muxhmp0slkksem9aux";

const protocolParamsUtxo = (
  await lucid.utxosByOutRef([
    {
      txHash:
        "6328d95ba23381ac375dc9ad062e560e338bbe069a9333f98ef6099777a7fd26",
      outputIndex: 1,
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
        "37cc30bdf97495dab5d32831d35229757b15ef92d5604cb69d8aa700bfeadcfb",
      outputIndex: 4,
    },
  ])
)[0];

const proposeMigrateTokenMph =
  "6ab15c93e023ac75eb14513311dde841c7c1fb8c301620387e3b9a19";
const proposeMigrateTokenName = MIGRATE_TOKEN_NAME;

assert(
  protocolParamsUtxo.datum != null,
  "Invalid project UTxO: Missing inline datum"
);

const protocolParams = S.fromData(
  S.fromCbor(protocolParamsUtxo.datum),
  ProtocolParamsDatum
);

// NOTE: only need to attach the migration info to the current registry
// const proposedRegistry: Registry = getProtocolRegistry(lucid, {
//   protocolNftMph: currentProtocolNftMph,
//   teikiPlantNftMph: currentTeikiPlantNftMph,
//   migrationInfo: {
//     migrateTokenMph: proposeMigrateTokenMph,
//     migrateTokenName: proposeMigrateTokenName,
//   },
// });

const currentRegistry: Registry = protocolParams.registry;

const currentSharedTreasuryVScriptHash =
  currentRegistry.sharedTreasuryValidator.latest.script.hash;

const currentDedicatedTreasuryVScriptHash =
  currentRegistry.dedicatedTreasuryValidator.latest.script.hash;

const proposedRegistry: Registry = {
  ...currentRegistry,
  sharedTreasuryValidator: constructMigratableScript(
    currentSharedTreasuryVScriptHash,
    {}
  ),
  dedicatedTreasuryValidator: constructMigratableScript(
    currentDedicatedTreasuryVScriptHash,
    {
      [currentDedicatedTreasuryVScriptHash]: {
        mintingPolicyHash: proposeMigrateTokenMph,
        tokenName: proposeMigrateTokenName,
      },
    }
  ),
};

// const proposedNonScriptParams = SAMPLE_PROTOCOL_NON_SCRIPT_PARAMS;

// const proposedGovernorAddress = governorAddress;
// const proposedStakingManagerAddress = governorAddress;

// const proposedProtocolParamsDatum: ProtocolParamsDatum = {
//   registry: proposedRegistry,
//   governorAddress: constructAddress(proposedGovernorAddress),
//   stakingManager: constructAddress(proposedStakingManagerAddress)
//     .paymentCredential,
//   ...proposedNonScriptParams,
// };
const proposedProtocolParamsDatum: ProtocolParamsDatum = {
  ...protocolParams,
  registry: proposedRegistry,
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
