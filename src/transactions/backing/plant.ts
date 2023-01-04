import { Address, Assets, Data, Lucid, UTxO, Unit } from "lucid-cardano";

import * as S from "@/schema";
import {
  BackingDatum,
  BackingRedeemer,
  Plant,
  ProofOfBackingMintingRedeemer,
} from "@/schema/teiki/backing";
import { ProjectDatum } from "@/schema/teiki/project";
import { ProtocolParamsDatum } from "@/schema/teiki/protocol";
import { SharedTreasuryRedeemer } from "@/schema/teiki/treasury";
import { Hex, TimeDifference } from "@/types";
import { assert } from "@/utils";

import {
  constructAddress,
  constructTxOutputId,
  hashBlake2b256,
} from "../helpers/constructors";
import { getCurrentTime } from "../helpers/lucid";

export type ProjectInfo = {
  id: Hex;
  currentMilestone: bigint;
};

export type BackingInfo = {
  // negative for unbacking
  // positive for backing
  amount: bigint;
  backerAddress: Address;
  backingUtxos: UTxO[];
};

export type SharedTreasuryInfo = {
  scriptRefUtxo: UTxO;
  utxo: UTxO;
};

export type TeikiInfo = {
  unit: Unit;
  scriptRefUtxo: UTxO;
};

export type PlantBackingParams = {
  protocolParamsUtxo: UTxO;
  projectInfo: ProjectInfo;
  backingInfo: BackingInfo;
  backingScriptAddress: Address;
  proofOfBackingPolicyRefUtxo: UTxO;
  projectUtxo: UTxO;
  projectScriptUtxo: UTxO;
  backingScriptRefUtxo?: UTxO;
  sharedTreasuryInfo?: SharedTreasuryInfo;
  teikiInfo?: TeikiInfo;
  txTimePadding?: TimeDifference;
};

// TODO: @sk-saru consider to merge createBackingTx with this tx
export function plantTx(
  lucid: Lucid,
  {
    protocolParamsUtxo,
    projectInfo,
    backingInfo,
    backingScriptAddress,
    proofOfBackingPolicyRefUtxo,
    projectUtxo,
    projectScriptUtxo,
    backingScriptRefUtxo,
    sharedTreasuryInfo,
    teikiInfo,
    txTimePadding = 200000,
  }: PlantBackingParams
) {
  assert(
    protocolParamsUtxo.datum != null,
    "Invalid protocol params UTxO: Missing inline datum"
  );

  const protocolParams = S.fromData(
    S.fromCbor(protocolParamsUtxo.datum),
    ProtocolParamsDatum
  );

  assert(
    projectUtxo.datum != null,
    "Invalid project UTxO: Missing inline datum"
  );

  const projectDatum = S.fromData(S.fromCbor(projectUtxo.datum), ProjectDatum);

  assert(
    proofOfBackingPolicyRefUtxo.scriptRef != null,
    "Invalid proof of backing reference UTxO: must reference proof of backing script"
  );

  const txTimeStart = getCurrentTime(lucid);

  const totalBackingAmount = backingInfo.backingUtxos.reduce(
    (acc, backingUtxo) => acc + backingUtxo.assets["lovelace"],
    0n
  );

  const remainBackingAmount = totalBackingAmount + backingInfo.amount;

  assert(
    remainBackingAmount >= 0n,
    "Current backing amount does not cover the unbacking amount"
  );

  const proofOfBackingMph = lucid.utils.validatorToScriptHash(
    proofOfBackingPolicyRefUtxo.scriptRef
  );

  // console.log("proofOfBackingMph :>> ", proofOfBackingMph);

  // TODO: num of produce backing UTxO indead of 1
  const seedTokenMintAmount = 1 - backingInfo.backingUtxos.length;

  let tx = lucid
    .newTx()
    .addSigner(backingInfo.backerAddress)
    .readFrom([proofOfBackingPolicyRefUtxo, projectUtxo, protocolParamsUtxo]);

  // TODO: @sk-saru this only use for unstake tx
  if (backingInfo.amount < 0n) {
    assert(
      backingScriptRefUtxo,
      "Missing backing validator reference script UTxO"
    );

    tx = tx
      .readFrom([backingScriptRefUtxo])
      .collectFrom(
        backingInfo.backingUtxos,
        S.toCbor(S.toData({ case: "Unstake" }, BackingRedeemer))
      );

    const unstakedAt = txTimeStart;
    const plantMap: Assets = {};
    let totalTeikiRewards = 0n;
    for (const backingUtxo of backingInfo.backingUtxos) {
      assert(
        backingUtxo.datum != null,
        "Invalid backing UTxO: Missing inline datum"
      );

      const backingDatum = S.fromData(
        S.fromCbor(backingUtxo.datum),
        BackingDatum
      );

      if (
        BigInt(unstakedAt) >=
        backingDatum.stakedAt.timestamp +
          protocolParams.epochLength.milliseconds
      ) {
        const backingAmount = backingUtxo.assets["lovelace"];

        // console.log("backingAmount :>> ", backingAmount);

        const isMatured =
          backingDatum.milestoneBacked < projectDatum.milestoneReached &&
          projectDatum.status.type !== "PreDelisted";

        const plant: Plant = {
          isMatured,
          backingOutputId: constructTxOutputId(backingUtxo),
          backingAmount,
          unstakedAt: { timestamp: BigInt(unstakedAt) },
          ...backingDatum,
        };

        const plantHash = hashBlake2b256(S.toCbor(S.toData(plant, Plant)));
        plantMap[proofOfBackingMph + plantHash] = 1n;

        const teikiRewards = isMatured
          ? (backingAmount *
              BigInt(BigInt(unstakedAt) - backingDatum.stakedAt.timestamp)) /
            BigInt(protocolParams.epochLength.milliseconds) /
            protocolParams.teikiCoefficient
          : 0n;

        totalTeikiRewards += teikiRewards;
      }

      if (totalTeikiRewards > 0) {
        assert(sharedTreasuryInfo, "Missing shared treasury information");
        assert(teikiInfo, "Missing teiki information");
        assert(
          teikiInfo.scriptRefUtxo.scriptRef,
          "Invalid teiki reference script UTxO: Missing inline datum"
        );
        assert(
          sharedTreasuryInfo.utxo.datum != null,
          "Missing shared treasury UTxO: Missing inline datum"
        );

        const burnAmount = 0n; // TODO: @sk-saru

        const sharedTreasuryRedeemer: SharedTreasuryRedeemer = {
          case: "Migrate",
          // case: "UpdateTeiki",
          // id: false,
          // burnAction: { burn: "BurnPeriodically" },
          // burnAmount: 0n,
          // rewards: totalTeikiRewards,
        };

        const teikiMint = 3n * totalTeikiRewards - burnAmount;

        console.log(
          "S.toCbor(S.toData(sharedTreasuryRedeemer, SharedTreasuryRedeemer)) :>> ",
          S.toCbor(S.toData(sharedTreasuryRedeemer, SharedTreasuryRedeemer))
        );

        console.log(
          "sharedTreasuryInfo.utxo.datum :>> ",
          sharedTreasuryInfo.utxo.datum
        );
        // console.log("teikiInfo.unit :>> ", teikiInfo.unit);
        tx = tx
          .readFrom([sharedTreasuryInfo.scriptRefUtxo, teikiInfo.scriptRefUtxo])
          .collectFrom(
            [sharedTreasuryInfo.utxo],
            S.toCbor(S.toData(sharedTreasuryRedeemer, SharedTreasuryRedeemer))
          )
          .mintAssets({ [teikiInfo.unit]: teikiMint });

        for (const unit in plantMap) {
          tx = tx.mintAssets({ [unit]: plantMap[unit] });
        }
      }
    }

    // console.log("totalTeikiRewards :>> ", totalTeikiRewards);
    // console.log("plantMap :>> ", plantMap);
  }

  if (remainBackingAmount > 0n) {
    const txTimeEnd = txTimeStart + txTimePadding;

    const backingDatum: BackingDatum = {
      projectId: { id: projectInfo.id },
      backerAddress: constructAddress(backingInfo.backerAddress),
      stakedAt: { timestamp: BigInt(txTimeEnd) },
      milestoneBacked: projectInfo.currentMilestone,
    };

    tx = tx
      .readFrom([projectScriptUtxo])
      .payToContract(
        backingScriptAddress,
        {
          inline: S.toCbor(S.toData(backingDatum, BackingDatum)),
        },
        { [proofOfBackingMph]: 1n, lovelace: remainBackingAmount }
      )
      .validFrom(txTimeStart)
      .validTo(txTimeEnd);
  }

  if (seedTokenMintAmount !== 0) {
    tx = tx.mintAssets(
      { [proofOfBackingMph]: BigInt(seedTokenMintAmount) },
      S.toCbor(
        S.toData(
          { case: "Plant", cleanup: false },
          ProofOfBackingMintingRedeemer
        )
      )
    );
  }

  return tx;
}
