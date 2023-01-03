import { Address, Lucid, UTxO } from "lucid-cardano";

import * as S from "@/schema";
import { BackingDatum } from "@/schema/teiki/backer";
import { assert } from "@/utils";

import { extractPaymentPubKeyHash } from "../helpers/constructors";

export type UnstakeBackingParams = {
  backerAddress: Address;
  backingUtxos: UTxO[];
  amount: bigint;
  cleanup?: boolean;
};

export function unstakeBackingTx(
  lucid: Lucid,
  { backerAddress, backingUtxos, amount, cleanup }: UnstakeBackingParams
) {
  // TODO: @sk-saru implement cleanup flow
  assert(cleanup, "TODO: implement cleanup transaction");

  assert(backingUtxos.length > 0, "Must consume at least one backing UTxO");

  let tx = lucid.newTx().collectFrom(backingUtxos);

  for (const backingUtxo of backingUtxos) {
    assert(
      backingUtxo.datum != null,
      "Invalid backing UTxO: Missing inline datum"
    );

    const backingDatum = S.fromData(
      S.fromCbor(backingUtxo.datum),
      BackingDatum
    );

    tx = tx.payToAddress(backerAddress, backingUtxo.assets);
  }
  return tx;
}
