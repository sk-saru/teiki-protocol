import { Data, Emulator, Lucid, UTxO, Unit } from "lucid-cardano";

import {
  compileBackingVScript,
  compileProjectSvScript,
  compileProofOfBackingMpScript,
  compileSharedTreasuryVScript,
  compileTeikiMpScript,
} from "@/commands/compile-scripts";
import { SAMPLE_PROTOCOL_NON_SCRIPT_PARAMS } from "@/commands/gen-protocol-params";
import {
  PROJECT_AT_TOKEN_NAMES,
  PROTOCOL_NFT_TOKEN_NAMES,
  TEIKI_TOKEN_NAME,
} from "@/contracts/common/constants";
import { exportScript } from "@/contracts/compile";
import * as S from "@/schema";
import { BackingDatum } from "@/schema/teiki/backing";
import { ProjectDatum, ProjectScriptDatum } from "@/schema/teiki/project";
import { ProtocolParamsDatum } from "@/schema/teiki/protocol";
import { SharedTreasuryDatum } from "@/schema/teiki/treasury";
import {
  PlantBackingParams,
  SharedTreasuryInfo,
  TeikiInfo,
  plantTx,
} from "@/transactions/backing/plant";
import {
  constructAddress,
  constructProjectIdUsingBlake2b,
  constructTxOutputId,
} from "@/transactions/helpers/constructors";
import { getCurrentTime, signAndSubmit } from "@/transactions/helpers/lucid";

import {
  attachUtxos,
  generateAccount,
  generateBlake2b224Hash,
  generateOutRef,
} from "./emulator";
import { generateProtocolRegistry } from "./utils";

const BACKER_ACCOUNT = await generateAccount();
const emulator = new Emulator([BACKER_ACCOUNT]);
const lucid = await Lucid.new(emulator);

describe("backing transactions", () => {
  // it("backing tx", async () => {
  //   expect.assertions(1);

  //   lucid.selectWalletFromSeed(BACKER_ACCOUNT.seedPhrase);

  //   const refScriptAddress = lucid.utils.credentialToAddress(
  //     lucid.utils.scriptHashToCredential(generateBlake2b224Hash())
  //   );

  //   const projectsAuthTokenMph = generateBlake2b224Hash();
  //   const protocolNftMph = generateBlake2b224Hash();
  //   const teikiMph = generateBlake2b224Hash();
  //   const projectId = constructProjectIdUsingBlake2b(generateOutRef());
  //   const protocolStakeValidatorHash = generateBlake2b224Hash();
  //   const backingValidatorHash = generateBlake2b224Hash();

  //   const proofOfBackingMintingPolicy = exportScript(
  //     compileProofOfBackingMpScript(
  //       projectsAuthTokenMph,
  //       protocolNftMph,
  //       teikiMph
  //     )
  //   );

  //   const proofOfBackingPolicyRefUtxo: UTxO = {
  //     ...generateOutRef(),
  //     address: refScriptAddress,
  //     assets: { lovelace: 2_000_000n },
  //     scriptRef: proofOfBackingMintingPolicy,
  //   };

  //   const projectStakeValidator = exportScript(
  //     compileProjectSvScript(
  //       projectId,
  //       "",
  //       projectsAuthTokenMph,
  //       protocolNftMph
  //     )
  //   );

  //   const projectATUnit: Unit =
  //     projectsAuthTokenMph + PROJECT_AT_TOKEN_NAMES.PROJECT;
  //   const projectScriptATUnit: Unit =
  //     projectsAuthTokenMph + PROJECT_AT_TOKEN_NAMES.PROJECT_SCRIPT;

  //   const projectAddress = lucid.utils.credentialToAddress(
  //     lucid.utils.scriptHashToCredential(generateBlake2b224Hash())
  //   );

  //   const ownerAddress = lucid.utils.credentialToAddress(
  //     lucid.utils.keyHashToCredential(generateBlake2b224Hash())
  //   );

  //   const current_project_milestone = 0n;

  //   const projectDatum: ProjectDatum = {
  //     projectId: { id: projectId },
  //     ownerAddress: constructAddress(ownerAddress),
  //     milestoneReached: current_project_milestone,
  //     isStakingDelegationManagedByProtocol: true,
  //     status: { type: "Active" },
  //   };

  //   const projectUtxo: UTxO = {
  //     ...generateOutRef(),
  //     address: projectAddress,
  //     assets: { lovelace: 2_000_000n, [projectATUnit]: 1n },
  //     datum: S.toCbor(S.toData(projectDatum, ProjectDatum)),
  //   };

  //   const projectScriptAddress = lucid.utils.credentialToAddress(
  //     lucid.utils.scriptHashToCredential(generateBlake2b224Hash())
  //   );

  //   const projectScriptDatum: ProjectScriptDatum = {
  //     projectId: { id: projectId },
  //     stakingKeyDeposit: 1n,
  //   };
  //   const projectScriptUtxo: UTxO = {
  //     ...generateOutRef(),
  //     address: projectScriptAddress,
  //     assets: { lovelace: 2_000_000n, [projectScriptATUnit]: 1n },
  //     datum: S.toCbor(S.toData(projectScriptDatum, ProjectScriptDatum)),
  //     scriptRef: projectStakeValidator,
  //   };

  //   const registry = generateProtocolRegistry(protocolStakeValidatorHash, {
  //     backing: backingValidatorHash,
  //   });

  //   const governorAddress = lucid.utils.credentialToAddress(
  //     lucid.utils.scriptHashToCredential(generateBlake2b224Hash())
  //   );

  //   const protocolParamsDatum: ProtocolParamsDatum = {
  //     registry,
  //     governorAddress: constructAddress(governorAddress),
  //     ...SAMPLE_PROTOCOL_NON_SCRIPT_PARAMS,
  //   };

  //   const protocolParamsAddress = lucid.utils.credentialToAddress(
  //     lucid.utils.scriptHashToCredential(generateBlake2b224Hash())
  //   );

  //   const protocolParamsNftUnit: Unit =
  //     protocolNftMph + PROTOCOL_NFT_TOKEN_NAMES.PARAMS;

  //   const protocolParamsUtxo: UTxO = {
  //     ...generateOutRef(),
  //     address: protocolParamsAddress,
  //     assets: { lovelace: 2_000_000n, [protocolParamsNftUnit]: 1n },
  //     datum: S.toCbor(S.toData(protocolParamsDatum, ProtocolParamsDatum)),
  //   };

  //   attachUtxos(emulator, [
  //     proofOfBackingPolicyRefUtxo,
  //     projectUtxo,
  //     projectScriptUtxo,
  //     protocolParamsUtxo,
  //   ]);

  //   const backingScriptAddress = lucid.utils.credentialToAddress(
  //     lucid.utils.scriptHashToCredential(backingValidatorHash),
  //     lucid.utils.scriptHashToCredential(
  //       lucid.utils.validatorToScriptHash(projectStakeValidator)
  //     )
  //   );

  //   const createBackingParams: PlantBackingParams = {
  //     protocolParamsUtxo,
  //     projectInfo: {
  //       id: projectId,
  //       currentMilestone: current_project_milestone,
  //     },
  //     backingInfo: {
  //       amount: 1_000_000_000n,
  //       backerAddress: BACKER_ACCOUNT.address,
  //       backingUtxos: [],
  //     },
  //     backingScriptAddress,
  //     proofOfBackingPolicyRefUtxo,
  //     projectUtxo,
  //     projectScriptUtxo,
  //   };

  //   const tx = plantTx(lucid, createBackingParams);

  //   const txComplete = await tx.complete();

  //   await expect(lucid.awaitTx(await signAndSubmit(txComplete))).resolves.toBe(
  //     true
  //   );
  // });

  it("plant backing tx", async () => {
    expect.assertions(1);

    lucid.selectWalletFromSeed(BACKER_ACCOUNT.seedPhrase);

    const refScriptAddress = lucid.utils.credentialToAddress(
      lucid.utils.scriptHashToCredential(generateBlake2b224Hash())
    );

    const projectsAuthTokenMph = generateBlake2b224Hash();
    const protocolNftMph = generateBlake2b224Hash();
    const projectId = constructProjectIdUsingBlake2b(generateOutRef());
    const protocolStakeValidatorHash = generateBlake2b224Hash();
    const nftTeikiPlantMph = generateBlake2b224Hash();

    const teikiMintingPolicy = exportScript(
      compileTeikiMpScript(nftTeikiPlantMph)
    );
    const teikiMph = lucid.utils.validatorToScriptHash(teikiMintingPolicy);
    console.log("teikiMph :>> ", teikiMph);

    const proofOfBackingMintingPolicy = exportScript(
      compileProofOfBackingMpScript(
        projectsAuthTokenMph,
        protocolNftMph,
        teikiMph
      )
    );

    const proofOfBackingMph = lucid.utils.validatorToScriptHash(
      proofOfBackingMintingPolicy
    );

    const proofOfBackingPolicyRefUtxo: UTxO = {
      ...generateOutRef(),
      address: refScriptAddress,
      assets: { lovelace: 2_000_000n },
      scriptRef: proofOfBackingMintingPolicy,
    };

    const projectStakeValidator = exportScript(
      compileProjectSvScript(
        projectId,
        "",
        projectsAuthTokenMph,
        protocolNftMph
      )
    );

    const projectATUnit: Unit =
      projectsAuthTokenMph + PROJECT_AT_TOKEN_NAMES.PROJECT;
    const projectScriptATUnit: Unit =
      projectsAuthTokenMph + PROJECT_AT_TOKEN_NAMES.PROJECT_SCRIPT;

    const projectAddress = lucid.utils.credentialToAddress(
      lucid.utils.scriptHashToCredential(generateBlake2b224Hash())
    );

    const ownerAddress = lucid.utils.credentialToAddress(
      lucid.utils.keyHashToCredential(generateBlake2b224Hash())
    );

    const current_project_milestone = 0n;

    const projectDatum: ProjectDatum = {
      projectId: { id: projectId },
      ownerAddress: constructAddress(ownerAddress),
      milestoneReached: current_project_milestone + 1n,
      isStakingDelegationManagedByProtocol: true,
      status: { type: "Active" },
    };

    const projectUtxo: UTxO = {
      ...generateOutRef(),
      address: projectAddress,
      assets: { lovelace: 2_000_000n, [projectATUnit]: 1n },
      datum: S.toCbor(S.toData(projectDatum, ProjectDatum)),
    };

    const projectScriptAddress = lucid.utils.credentialToAddress(
      lucid.utils.scriptHashToCredential(generateBlake2b224Hash())
    );

    const projectScriptDatum: ProjectScriptDatum = {
      projectId: { id: projectId },
      stakingKeyDeposit: 1n,
    };
    const projectScriptUtxo: UTxO = {
      ...generateOutRef(),
      address: projectScriptAddress,
      assets: { lovelace: 2_000_000n, [projectScriptATUnit]: 1n },
      datum: S.toCbor(S.toData(projectScriptDatum, ProjectScriptDatum)),
      scriptRef: projectStakeValidator,
    };

    const backingValidator = exportScript(
      compileBackingVScript(proofOfBackingMph, protocolNftMph)
    );

    const backingValidatorHash =
      lucid.utils.validatorToScriptHash(backingValidator);

    const backingScriptRefUtxo: UTxO = {
      ...generateOutRef(),
      address: refScriptAddress,
      assets: { lovelace: 2_000_000n },
      scriptRef: backingValidator,
    };

    const sharedTreasuryValidator = exportScript(
      compileSharedTreasuryVScript(protocolNftMph)
    );

    const sharedTreasuryValidatorHash = lucid.utils.validatorToScriptHash(
      sharedTreasuryValidator
    );

    const sharedTreasuryScriptRefUtxo: UTxO = {
      ...generateOutRef(),
      address: refScriptAddress,
      assets: { lovelace: 2_000_000n },
      scriptRef: sharedTreasuryValidator,
    };

    const sharedTreasuryAddress = lucid.utils.credentialToAddress(
      lucid.utils.scriptHashToCredential(sharedTreasuryValidatorHash)
    );

    const sharedTreasuryDatum: SharedTreasuryDatum = {
      projectId: { id: projectId },
      governorTeiki: 0n,
      projectTeiki: {
        teikiCondition: "TeikiEmpty",
      },
      tag: {
        kind: "TagContinuation",
        former: constructTxOutputId(generateOutRef()),
      },
    };

    const sharedTreasuryUtxo: UTxO = {
      ...generateOutRef(),
      address: sharedTreasuryAddress,
      assets: { lovelace: 2_000_000n },
      // datum: S.toCbor(S.toData(sharedTreasuryDatum, SharedTreasuryDatum)),
      datum: Data.void(),
    };

    const registry = generateProtocolRegistry(protocolStakeValidatorHash, {
      backing: backingValidatorHash,
      sharedTreasury: sharedTreasuryValidatorHash,
    });

    console.log("registry :>> ", JSON.stringify(registry));

    const governorAddress = lucid.utils.credentialToAddress(
      lucid.utils.scriptHashToCredential(generateBlake2b224Hash())
    );

    const protocolParamsDatum: ProtocolParamsDatum = {
      registry,
      governorAddress: constructAddress(governorAddress),
      ...SAMPLE_PROTOCOL_NON_SCRIPT_PARAMS,
    };

    const protocolParamsAddress = lucid.utils.credentialToAddress(
      lucid.utils.scriptHashToCredential(generateBlake2b224Hash())
    );

    const protocolParamsNftUnit: Unit =
      protocolNftMph + PROTOCOL_NFT_TOKEN_NAMES.PARAMS;

    const protocolParamsUtxo: UTxO = {
      ...generateOutRef(),
      address: protocolParamsAddress,
      assets: { lovelace: 2_000_000n, [protocolParamsNftUnit]: 1n },
      datum: S.toCbor(S.toData(protocolParamsDatum, ProtocolParamsDatum)),
    };

    const backingScriptAddress = lucid.utils.credentialToAddress(
      lucid.utils.scriptHashToCredential(backingValidatorHash),
      lucid.utils.scriptHashToCredential(
        lucid.utils.validatorToScriptHash(projectStakeValidator)
      )
    );

    const backingDatum: BackingDatum = {
      projectId: { id: projectId },
      backerAddress: constructAddress(BACKER_ACCOUNT.address),
      stakedAt: { timestamp: BigInt(getCurrentTime(lucid)) },
      milestoneBacked: current_project_milestone,
    };

    const backingUtxo = {
      ...generateOutRef(),
      address: backingScriptAddress,
      assets: { lovelace: 500_000_000n, [proofOfBackingMph]: 1n },
      datum: S.toCbor(S.toData(backingDatum, BackingDatum)),
    };

    console.log("teikiMintingPolicy :>> ", teikiMintingPolicy);
    const teikiScriptRefUtxo: UTxO = {
      ...generateOutRef(),
      address: refScriptAddress,
      assets: { lovelace: 2_000_000n },
      scriptRef: teikiMintingPolicy,
    };

    const teikiInfo: TeikiInfo = {
      unit: teikiMph + TEIKI_TOKEN_NAME,
      scriptRefUtxo: teikiScriptRefUtxo,
    };

    const sharedTreasuryInfo: SharedTreasuryInfo = {
      scriptRefUtxo: sharedTreasuryScriptRefUtxo,
      utxo: sharedTreasuryUtxo,
    };

    attachUtxos(emulator, [
      proofOfBackingPolicyRefUtxo,
      projectUtxo,
      projectScriptUtxo,
      protocolParamsUtxo,
      backingUtxo,
      backingScriptRefUtxo,
      teikiScriptRefUtxo,
      sharedTreasuryScriptRefUtxo,
      sharedTreasuryUtxo,
    ]);

    const plantBackingParams = {
      protocolParamsUtxo,
      projectInfo: {
        id: projectId,
        currentMilestone: current_project_milestone,
      },
      backingInfo: {
        amount: -400_000_000n,
        backerAddress: BACKER_ACCOUNT.address,
        backingUtxos: [backingUtxo],
      },
      backingScriptAddress,
      proofOfBackingPolicyRefUtxo,
      projectUtxo,
      projectScriptUtxo,
      backingScriptRefUtxo,
      teikiInfo,
      sharedTreasuryInfo,
    };

    // after n blocks, backer could claim teiki rewards
    emulator.awaitBlock(100);
    console.log("before  :>> ");

    const tx = plantTx(lucid, plantBackingParams);

    console.log("await tx.toString() :>> ", await tx.toString());

    const txComplete = await tx.complete();

    await expect(lucid.awaitTx(await signAndSubmit(txComplete))).resolves.toBe(
      true
    );
  });
});
