import { Lucid, UTxO, Unit, getAddressDetails } from "lucid-cardano";

import { PROJECT_AT_TOKEN_NAMES } from "@/contracts/common/constants";
import { getCurrentTime } from "@/helpers/lucid";
import * as S from "@/schema";
import {
  ProjectDatum,
  ProjectDetailRedeemer,
  ProjectRedeemer,
} from "@/schema/teiki/project";
import { ProtocolParamsDatum } from "@/schema/teiki/protocol";
import { OpenTreasuryDatum } from "@/schema/teiki/treasury";
import { Hex, TimeDifference } from "@/types";
import { assert } from "@/utils";

import {
  INACTIVE_PROJECT_UTXO_ADA,
  PROJECT_DELIST_DISCOUNT_CENTS,
  RATIO_MULTIPLIER,
} from "../constants";

export type ProjectUtxoInfo = {
  projectUtxo: UTxO;
  projectDetailUtxo: UTxO;
};

export type FinalizeDelistParams = {
  projectUtxoInfo: ProjectUtxoInfo[];
  projectVRefScriptUtxo: UTxO;
  projectDetailVRefScriptUtxo: UTxO;
  protocolParamsUtxo: UTxO;
  projectAtMph: Hex;
  txTimeStartPadding?: TimeDifference;
  txTimeEndPadding?: TimeDifference;
};

export function finalizeDelistTx(
  lucid: Lucid,
  {
    projectUtxoInfo,
    projectVRefScriptUtxo,
    projectDetailVRefScriptUtxo,
    protocolParamsUtxo,
    projectAtMph,
    txTimeStartPadding = 60_000,
    txTimeEndPadding = 60_000,
  }: FinalizeDelistParams
) {
  assert(
    protocolParamsUtxo.datum != null,
    "Invalid protocol params UTxO: Missing inline datum"
  );

  const protocolParams = S.fromData(
    S.fromCbor(protocolParamsUtxo.datum),
    ProtocolParamsDatum
  );

  const now = getCurrentTime(lucid);
  const txTimeStart = now - txTimeStartPadding;
  const txTimeEnd = now + txTimeEndPadding;

  const projectATUnit: Unit = projectAtMph + PROJECT_AT_TOKEN_NAMES.PROJECT;

  let tx = lucid
    .newTx()
    .readFrom([
      projectVRefScriptUtxo,
      protocolParamsUtxo,
      projectDetailVRefScriptUtxo,
    ])
    .validFrom(txTimeStart)
    .validTo(txTimeEnd);

  const protocolStakeCredential = lucid.utils.scriptHashToCredential(
    protocolParams.registry.protocolStakingValidator.script.hash
  );

  const openTreasuryCredential = lucid.utils.scriptHashToCredential(
    protocolParams.registry.openTreasuryValidator.latest.script.hash
  );

  for (const { projectUtxo, projectDetailUtxo } of projectUtxoInfo) {
    assert(
      projectUtxo.datum != null,
      "Invalid project UTxO: Missing inline datum"
    );
    assert(
      projectDetailUtxo.datum != null,
      "Invalid project detail UTxO: Missing inline datum"
    );

    const projectDatum = S.fromData(
      S.fromCbor(projectUtxo.datum),
      ProjectDatum
    );

    const outputProjectDatum: ProjectDatum = {
      ...projectDatum,
      status: {
        type: "Delisted",
      },
    };

    const projectCredential = getAddressDetails(
      projectUtxo.address
    ).paymentCredential;
    assert(
      projectCredential,
      "Cannot extract payment credential from the project address"
    );

    const outputProjectAddress = lucid.utils.credentialToAddress(
      projectCredential,
      protocolStakeCredential
    );

    const projectDetailCredential = getAddressDetails(
      projectDetailUtxo.address
    ).paymentCredential;
    assert(
      projectDetailCredential,
      "Cannot extract payment credential from the project detail address"
    );

    const outputProjectDetailAddress = lucid.utils.credentialToAddress(
      projectDetailCredential,
      protocolStakeCredential
    );

    const adaToTreasury =
      BigInt(projectUtxo.assets.lovelace) -
      INACTIVE_PROJECT_UTXO_ADA -
      BigInt(protocolParams.discountCentPrice) * PROJECT_DELIST_DISCOUNT_CENTS;

    tx = tx
      .collectFrom(
        [projectUtxo],
        S.toCbor(S.toData({ case: "FinalizeDelist" }, ProjectRedeemer))
      )
      .payToContract(
        outputProjectAddress,
        { inline: S.toCbor(S.toData(outputProjectDatum, ProjectDatum)) },
        { lovelace: INACTIVE_PROJECT_UTXO_ADA }
      )
      .payToContract(
        outputProjectAddress,
        { inline: S.toCbor(S.toData(outputProjectDatum, ProjectDatum)) },
        { [projectATUnit]: 1n }
      )
      .collectFrom(
        [projectDetailUtxo],
        S.toCbor(S.toData({ case: "Delist" }, ProjectDetailRedeemer))
      )
      .payToContract(
        outputProjectDetailAddress,
        { inline: projectDetailUtxo.datum },
        { ...projectDetailUtxo.assets }
      );
    if (adaToTreasury > 0n) {
      const openTreasuryAddress = lucid.utils.credentialToAddress(
        openTreasuryCredential,
        protocolStakeCredential
      );

      const openTreasuryDatum: OpenTreasuryDatum = {
        governorAda:
          (adaToTreasury * BigInt(protocolParams.governorShareRatio)) /
          RATIO_MULTIPLIER,
        tag: {
          kind: "TagProjectDelisted",
          projectId: projectDatum.projectId,
        },
      };
      tx = tx.payToContract(
        openTreasuryAddress,
        {
          inline: S.toCbor(S.toData(openTreasuryDatum, OpenTreasuryDatum)),
        },
        { lovelace: adaToTreasury }
      );
    }
  }
  return tx;
}
