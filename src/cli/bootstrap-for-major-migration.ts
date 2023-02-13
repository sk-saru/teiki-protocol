import { Lucid } from "lucid-cardano";

import {
  compileProtocolNftScript,
  compileProjectsAtMpScript,
  compileProtocolSvScript,
  compileProtocolParamsVScript,
  compileProtocolProposalVScript,
  compileProtocolScriptVScript,
  compileProjectVScript,
  compileProjectDetailVScript,
  compileProjectScriptVScript,
  compileProofOfBackingMpScript,
  compileBackingVScript,
  compileDedicatedTreasuryVScript,
  compileSharedTreasuryVScript,
  compileOpenTreasuryVScript,
} from "@/commands/compile-scripts";
import {
  getProtocolRegistry,
  SAMPLE_PROTOCOL_NON_SCRIPT_PARAMS,
} from "@/commands/generate-protocol-params";
import { getLucid } from "@/commands/utils";
import { exportScript } from "@/contracts/compile";
import { signAndSubmit } from "@/helpers/lucid";
import { Registry } from "@/schema/teiki/protocol";
import {
  BootstrapProtocolParams,
  bootstrapProtocolTx,
} from "@/transactions/protocol/bootstrap";
import { Hex } from "@/types";

import { deployReferencedScript, printScriptHash, sleep } from "./utils";

const POOL_ID = "pool1z9nsz7wyyxc5r8zf8pf774p9gry09yxtrlqlg5tsnjndv5xupu3";

// Staking manager address - only use payment credential
const STAKING_MANAGER_ADDRESS =
  "addr_test1qr96lcz9ac5ujtkwxzwgc8u276hcm5zp8u82hvgkh7spcwl6vq0xp4mj8q472g22vfpp5n3mgcxwlrm0dqd4uuch2cqqug4st7";

const lucid = await getLucid();
const governorAddress = await lucid.wallet.address();

const teikiPlantNftMph =
  "aedc1186040e7a026788ce6ebe6ebde07a593adaa74861d6f00855df";

const teikiMph = "596f0025dc3204d33feda79f22bd4945d0861671c4cf051c6bf6ff86";

const scripts = await runBootstapProtocol(lucid, teikiPlantNftMph);

const protocolNftMph = lucid.utils.validatorToScriptHash(
  scripts.PROTOCOL_NFT_MPH
);

const protocolScripts = {
  PROTOCOL_SV_SCRIPT_HASH: scripts.PROTOCOL_SV_SCRIPT_HASH,
  PROTOCOL_PARAMS_V_SCRIPT_HASH: scripts.PROTOCOL_PARAMS_V_SCRIPT_HASH,
  PROTOCOL_PROPOSAL_V_SCRIPT_HASH: scripts.PROTOCOL_PROPOSAL_V_SCRIPT_HASH,
  PROTOCOL_SCRIPT_V_SCRIPT_HASH: scripts.PROTOCOL_SCRIPT_V_SCRIPT_HASH,
};

const remainingScripts = {
  PROJECT_AT_MPH: scripts.PROJECT_AT_MPH,
  PROJECT_DETAIL_V_SCRIPT_HASH: scripts.PROJECT_DETAIL_V_SCRIPT_HASH,
  PROJECT_SCRIPT_V_SCRIPT_HASH: scripts.PROJECT_SCRIPT_V_SCRIPT_HASH,
  PROJECT_V_SCRIPT_HASH: scripts.PROJECT_V_SCRIPT_HASH,
  PROOF_OF_BACKING_MPH: scripts.PROOF_OF_BACKING_MPH,
  BACKING_V_SCRIPT_HASH: scripts.BACKING_V_SCRIPT_HASH,
  DEDICATED_TREASURY_V_SCRIPT_HASH: scripts.DEDICATED_TREASURY_V_SCRIPT_HASH,
  SHARED_TREASURY_V_SCRIPT_HASH: scripts.SHARED_TREASURY_V_SCRIPT_HASH,
  OPEN_TREASURY_V_SCRIPT_HASH: scripts.OPEN_TREASURY_V_SCRIPT_HASH,
};

const alwaysFalseAddress = lucid.utils.credentialToAddress(
  lucid.utils.scriptHashToCredential(
    "51936f3c98a04b6609aa9b5c832ba1182cf43a58e534fcc05db09d69"
  )
);

const protocolScriptVAddress = lucid.utils.validatorToAddress(
  scripts.PROTOCOL_SCRIPT_V_SCRIPT_HASH,
  lucid.utils.scriptHashToCredential(
    lucid.utils.validatorToScriptHash(scripts.PROTOCOL_SV_SCRIPT_HASH)
  )
);

await deployReferencedScript(
  lucid,
  Object.values({ ...protocolScripts }),
  alwaysFalseAddress
);
await sleep(60_000);

console.log("\n=============== Protocol scripts: =====================\n");
console.log(`PROTOCOL_NFT_MPH=${protocolNftMph}`);
printScriptHash(lucid, protocolScripts);
console.log("=======================================================");

await deployReferencedScript(
  lucid,
  Object.values(remainingScripts),
  protocolScriptVAddress
);

console.log("\n=============== Remaining scripts: ====================\n");
printScriptHash(lucid, remainingScripts);
console.log("=======================================================");

async function runBootstapProtocol(lucid: Lucid, teikiPlantNftMph: Hex) {
  const seedUtxo = (await lucid.wallet.getUtxos())[0];

  const protocolNftScript = exportScript(
    compileProtocolNftScript({ protocolSeed: seedUtxo })
  );
  const protocolNftMph = lucid.utils.validatorToScriptHash(protocolNftScript);

  const projectAtScript = exportScript(
    compileProjectsAtMpScript({ protocolNftMph })
  );
  const projectAtMph = lucid.utils.validatorToScriptHash(projectAtScript);

  const protocolSvScript = exportScript(
    compileProtocolSvScript({ protocolNftMph })
  );
  const protocolParamsVScript = exportScript(
    compileProtocolParamsVScript({ protocolNftMph })
  );
  const protocolProposalVScript = exportScript(
    compileProtocolProposalVScript({ protocolNftMph })
  );
  const protocolScriptVScript = exportScript(
    compileProtocolScriptVScript({ protocolNftMph })
  );
  const projectVScript = exportScript(
    compileProjectVScript({ projectAtMph, protocolNftMph })
  );
  const projectDetailVScript = exportScript(
    compileProjectDetailVScript({ projectAtMph, protocolNftMph })
  );
  const projectScriptVScript = exportScript(
    compileProjectScriptVScript({ projectAtMph, protocolNftMph })
  );
  const proofOfBackingMpScript = exportScript(
    compileProofOfBackingMpScript({ projectAtMph, protocolNftMph, teikiMph })
  );
  const proofOfBackingMph = lucid.utils.validatorToScriptHash(
    proofOfBackingMpScript
  );
  const backingVScript = exportScript(
    compileBackingVScript({ proofOfBackingMph, protocolNftMph })
  );
  const dedicatedTreasuryVScript = exportScript(
    compileDedicatedTreasuryVScript({ projectAtMph, protocolNftMph })
  );
  const sharedTreasuryVScript = exportScript(
    compileSharedTreasuryVScript({
      projectAtMph,
      protocolNftMph,
      teikiMph,
      proofOfBackingMph,
    })
  );
  const openTreasuryVScript = exportScript(
    compileOpenTreasuryVScript({ protocolNftMph })
  );

  const protocolParamsVHash = lucid.utils.validatorToScriptHash(
    protocolParamsVScript
  );

  const protocolSvHash = lucid.utils.validatorToScriptHash(protocolSvScript);
  const protocolProposalVHash = lucid.utils.validatorToScriptHash(
    protocolProposalVScript
  );

  const protocolStakeCredential =
    lucid.utils.scriptHashToCredential(protocolSvHash);

  const protocolStakeAddress = lucid.utils.credentialToRewardAddress(
    protocolStakeCredential
  );

  const protocolParamsAddress = lucid.utils.credentialToAddress(
    lucid.utils.scriptHashToCredential(protocolParamsVHash),
    protocolStakeCredential
  );
  const protocolProposalAddress = lucid.utils.credentialToAddress(
    lucid.utils.scriptHashToCredential(protocolProposalVHash),
    protocolStakeCredential
  );

  const registry: Registry = getProtocolRegistry(lucid, {
    protocolNftMph,
    teikiPlantNftMph,
  });

  const params: BootstrapProtocolParams = {
    protocolParams: SAMPLE_PROTOCOL_NON_SCRIPT_PARAMS,
    seedUtxo: seedUtxo,
    governorAddress,
    stakingManagerAddress: STAKING_MANAGER_ADDRESS,
    poolId: POOL_ID,
    registry,
    protocolNftScript,
    protocolParamsAddress,
    protocolProposalAddress,
    protocolStakeAddress,
    protocolStakeValidator: protocolSvScript,
  };

  const tx = bootstrapProtocolTx(lucid, params);

  const txComplete = await tx.complete();
  console.log("Submit bootstrap protcol transaction...\n");
  const txHash = await signAndSubmit(txComplete);

  console.log("Wait for confirmations...\n");
  const result = await lucid.awaitTx(txHash);

  console.log(
    `Bootstrap protcol transaction ${result} and txHash: ${txHash}\n`
  );

  const scripts = {
    PROTOCOL_NFT_MPH: protocolNftScript,
    PROTOCOL_SV_SCRIPT_HASH: protocolSvScript,
    PROTOCOL_PARAMS_V_SCRIPT_HASH: protocolParamsVScript,
    PROTOCOL_PROPOSAL_V_SCRIPT_HASH: protocolProposalVScript,
    PROTOCOL_SCRIPT_V_SCRIPT_HASH: protocolScriptVScript,
    PROJECT_AT_MPH: projectAtScript,
    PROJECT_DETAIL_V_SCRIPT_HASH: projectDetailVScript,
    PROJECT_SCRIPT_V_SCRIPT_HASH: projectScriptVScript,
    PROJECT_V_SCRIPT_HASH: projectVScript,
    PROOF_OF_BACKING_MPH: proofOfBackingMpScript,
    BACKING_V_SCRIPT_HASH: backingVScript,
    DEDICATED_TREASURY_V_SCRIPT_HASH: dedicatedTreasuryVScript,
    SHARED_TREASURY_V_SCRIPT_HASH: sharedTreasuryVScript,
    OPEN_TREASURY_V_SCRIPT_HASH: openTreasuryVScript,
  };

  return scripts;
}
