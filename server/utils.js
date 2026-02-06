import { ObjectId } from "mongodb";

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function toObjectId(id) {
  if (!ObjectId.isValid(id)) {
    throw new HttpError(400, "Invalid id");
  }
  return new ObjectId(id);
}

export function buildIdFilter(rawId) {
  const id = String(rawId ?? "");
  if (!id) {
    throw new HttpError(400, "Invalid id");
  }

  const filters = [];
  if (ObjectId.isValid(id)) {
    filters.push({ _id: new ObjectId(id) });
  }
  filters.push({ _id: id });
  filters.push({ id });

  return filters.length === 1 ? filters[0] : { $or: filters };
}

export function toApiDoc(doc) {
  if (!doc) return doc;
  const { _id, id: _legacyId, ...rest } = doc;
  const apiDoc = { id: String(_id), ...rest };
  if (_legacyId !== undefined) {
    apiDoc.legacy_id = _legacyId;
  }
  return apiDoc;
}

export function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
