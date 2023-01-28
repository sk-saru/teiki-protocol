import { Unit, fromText } from "lucid-cardano";

import {
  compileProjectDetailVScript,
  compileProjectScriptVScript,
  compileProjectVScript,
  compileSampleMigrateTokenMpScript,
} from "@/commands/compile-scripts";
import {
  RegistryScript,
  SAMPLE_PROTOCOL_NON_SCRIPT_PARAMS,
  getProtocolRegistry,
} from "@/commands/generate-protocol-params";
import { getLucid } from "@/commands/utils";
import { PROTOCOL_NFT_TOKEN_NAMES } from "@/contracts/common/constants";
import { exportScript } from "@/contracts/compile";
import { getPaymentKeyHash, signAndSubmit } from "@/helpers/lucid";
import { constructAddress } from "@/helpers/schema";
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
        "da63154d5b79d3eef11034a9180b8e7b827daf46b1c35733dd59fef832352862",
      outputIndex: 0,
    },
  ])
)[0];

assert(
  protocolParamsUtxo.datum != null,
  "Invalid protocol params UTxO: Missing inline datum"
);

const protocolParams = S.fromData(
  S.fromCbor(protocolParamsUtxo.datum),
  ProtocolParamsDatum
);

const registry: Registry = protocolParams.registry;

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

const proposeMigrateTokenMph = lucid.utils.validatorToScriptHash(
  exportScript(
    compileSampleMigrateTokenMpScript({
      governorPkh: getPaymentKeyHash(governorAddress),
    })
  )
);
const proposeMigrateTokenName = fromText("migration");

const projectAtMph = "8e508e18d47c836420c93e590f2f83e3105aebc6d3233a35a8ee12a8";

const registryScript: RegistryScript = {
  protocolSvHash: registry.protocolStakingValidator.script.hash,
  projectVHash: lucid.utils.validatorToScriptHash(
    exportScript(
      compileProjectVScript({
        projectAtMph,
        protocolNftMph: currentProtocolNftMph,
      })
    )
  ),
  projectDetailVHash: lucid.utils.validatorToScriptHash(
    exportScript(
      compileProjectDetailVScript({
        projectAtMph,
        protocolNftMph: currentProtocolNftMph,
      })
    )
  ),
  projectScriptVHash: lucid.utils.validatorToScriptHash(
    exportScript(
      compileProjectScriptVScript({
        projectAtMph,
        protocolNftMph: currentProtocolNftMph,
      })
    )
  ),
  backingVHash: registry.backingValidator.latest.script.hash,
  dedicatedTreasuryVHash:
    registry.dedicatedTreasuryValidator.latest.script.hash,
  sharedTreasuryVHash: registry.sharedTreasuryValidator.latest.script.hash,
  openTreasuryVHash: registry.openTreasuryValidator.latest.script.hash,
};

const proposedRegistry: Registry = getProtocolRegistry({
  registryScript,
  migrationInfo: {
    migrateTokenMph: proposeMigrateTokenMph,
    migrateTokenName: proposeMigrateTokenName,
  },
});

const proposedNonScriptParams = SAMPLE_PROTOCOL_NON_SCRIPT_PARAMS;

const proposedGovernorAddress = governorAddress;
const proposedStakingManagerAddress = governorAddress;

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
