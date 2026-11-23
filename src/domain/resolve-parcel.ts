import type { Application, ParcelRecord, RuleRegistry } from "./types.js";

export type ParcelResolution =
  | { kind: "found"; parcel: ParcelRecord }
  | { kind: "ambiguous"; parcelIds: string[] }
  | { kind: "not-found" };

export function resolveParcel(app: Application, registry: RuleRegistry): ParcelResolution {
  if (app.parcel_id !== undefined) {
    const parcel = registry.getParcel(app.parcel_id);
    return parcel === null ? { kind: "not-found" } : { kind: "found", parcel };
  }
  const address = app.address_query;
  if (address === undefined) {
    return { kind: "not-found" };
  }
  const matches = registry.parcelsForAddress(address);
  if (matches.length === 0) {
    return { kind: "not-found" };
  }
  if (matches.length > 1) {
    return { kind: "ambiguous", parcelIds: matches.map((parcel) => parcel.parcel_id) };
  }
  const only = matches[0];
  if (only === undefined) {
    return { kind: "not-found" };
  }
  return { kind: "found", parcel: only };
}
