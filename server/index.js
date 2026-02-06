import "dotenv/config";

import cors from "cors";
import express from "express";

import { getDb, getMongoClient } from "./mongo.js";
import { HttpError, buildIdFilter, escapeRegex, toApiDoc, toObjectId } from "./utils.js";

function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function nowIso() {
  return new Date().toISOString();
}

function generateNextMac(lastMacHex, offset) {
  const num = parseInt(lastMacHex, 16) + offset + 1;
  const nextHex = num.toString(16).padStart(12, "0").toUpperCase();
  return nextHex.match(/.{2}/g).join(":");
}

function generateNextSerial(lastSerial, prefix, index) {
  let startNum = 0;
  if (lastSerial?.startsWith(prefix)) {
    const numPart = lastSerial.slice(prefix.length);
    if (!Number.isNaN(Number(numPart))) {
      startNum = Number.parseInt(numPart, 10);
    }
  }
  const serialNum = String(startNum + index + 1).padStart(5, "0");
  return `${prefix}${serialNum}`;
}

async function ensureIndexes(db) {
  await Promise.all([
    db.collection("categories").createIndex({ category_name: 1 }, { unique: true }),
    db.collection("chipsets").createIndex({ chipset_name: 1 }, { unique: true }),
    db.collection("models").createIndex({ model_number: 1 }, { unique: true }),
    db.collection("models").createIndex({ category_name: 1 }),
    db.collection("models").createIndex({ chipset_name: 1 }),
    db.collection("generate_groups").createIndex({ model_number: 1, generated_at: -1 }),
    db.collection("generate_groups").createIndex({ "serials.serialNumber": 1 }),
    db.collection("generate_groups").createIndex({ "serials.macIds": 1 }),
  ]);
}

async function ensureMacCounter(db) {
  const macCounterCol = db.collection("mac_counter");
  const existing = await macCounterCol.findOne({ _id: "global_mac_counter" });
  if (existing) return;
  await macCounterCol.insertOne({
    _id: "global_mac_counter",
    last_mac_hex: "0C7FEDB00000",
    updated_at: nowIso(),
  });
}

const app = express();
app.disable("x-powered-by");
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get(
  "/api/health",
  asyncHandler(async (_req, res) => {
    res.json({ ok: true });
  }),
);

// Categories
app.get(
  "/api/categories",
  asyncHandler(async (_req, res) => {
    const db = await getDb();
    const categories = await db
      .collection("categories")
      .find({})
      .project({ prefix: 0 })
      .sort({ category_name: 1 })
      .toArray();
    res.json(categories.map(toApiDoc));
  }),
);

app.get(
  "/api/categories/by-name/:categoryName",
  asyncHandler(async (req, res) => {
    const categoryName = decodeURIComponent(req.params.categoryName ?? "");
    if (!categoryName) throw new HttpError(400, "categoryName is required");

    const db = await getDb();
    const category = await db.collection("categories").findOne({ category_name: categoryName }, { projection: { prefix: 0 } });
    if (!category) throw new HttpError(404, "Category not found");
    res.json(toApiDoc(category));
  }),
);

app.post(
  "/api/categories",
  asyncHandler(async (req, res) => {
    const { category_name, types } = req.body ?? {};
    if (!category_name || typeof category_name !== "string") {
      throw new HttpError(400, "category_name is required");
    }
    if (!Array.isArray(types) || !types.every((t) => typeof t === "string")) {
      throw new HttpError(400, "types must be an array of strings");
    }

    const db = await getDb();
    const doc = {
      category_name: category_name.trim(),
      types: types.map((t) => t.trim()).filter(Boolean),
      created_at: nowIso(),
    };

    const result = await db.collection("categories").insertOne(doc);
    res.status(201).json(toApiDoc({ _id: result.insertedId, ...doc }));
  }),
);

app.put(
  "/api/categories/:id",
  asyncHandler(async (req, res) => {
    const filter = buildIdFilter(req.params.id);
    const { category_name, types, original_category_name } = req.body ?? {};
    if (!category_name || typeof category_name !== "string") {
      throw new HttpError(400, "category_name is required");
    }
    if (!Array.isArray(types) || !types.every((t) => typeof t === "string")) {
      throw new HttpError(400, "types must be an array of strings");
    }

    const db = await getDb();
    const updateDoc = {
      category_name: category_name.trim(),
      types: types.map((t) => t.trim()).filter(Boolean),
    };

    let updatedCategory = await db
      .collection("categories")
      .findOneAndUpdate(filter, { $set: updateDoc, $unset: { prefix: "" } }, { returnDocument: "after" });

    if (!updatedCategory && typeof original_category_name === "string" && original_category_name.trim()) {
      updatedCategory = await db
        .collection("categories")
        .findOneAndUpdate(
          { category_name: original_category_name.trim() },
          { $set: updateDoc, $unset: { prefix: "" } },
          { returnDocument: "after" },
        );
    }

    if (!updatedCategory) throw new HttpError(404, "Category not found");
    res.json(toApiDoc(updatedCategory));
  }),
);

app.delete(
  "/api/categories/:id",
  asyncHandler(async (req, res) => {
    const filter = buildIdFilter(req.params.id);
    const db = await getDb();
    const result = await db.collection("categories").deleteOne(filter);
    if (result.deletedCount === 0) throw new HttpError(404, "Category not found");
    res.json({ success: true });
  }),
);

// Chipsets
app.get(
  "/api/chipsets",
  asyncHandler(async (_req, res) => {
    const db = await getDb();
    const chipsets = await db.collection("chipsets").find({}).sort({ chipset_name: 1 }).toArray();
    res.json(chipsets.map(toApiDoc));
  }),
);

app.post(
  "/api/chipsets",
  asyncHandler(async (req, res) => {
    const { chipset_name } = req.body ?? {};
    if (!chipset_name || typeof chipset_name !== "string") {
      throw new HttpError(400, "chipset_name is required");
    }

    const db = await getDb();
    const doc = { chipset_name: chipset_name.trim(), created_at: nowIso() };
    const result = await db.collection("chipsets").insertOne(doc);
    res.status(201).json(toApiDoc({ _id: result.insertedId, ...doc }));
  }),
);

app.put(
  "/api/chipsets/:id",
  asyncHandler(async (req, res) => {
    const filter = buildIdFilter(req.params.id);
    const { chipset_name } = req.body ?? {};
    if (!chipset_name || typeof chipset_name !== "string") {
      throw new HttpError(400, "chipset_name is required");
    }

    const db = await getDb();
    const updatedChipset = await db.collection("chipsets").findOneAndUpdate(
      filter,
      { $set: { chipset_name: chipset_name.trim() } },
      { returnDocument: "after" },
    );
    if (!updatedChipset) throw new HttpError(404, "Chipset not found");
    res.json(toApiDoc(updatedChipset));
  }),
);

app.delete(
  "/api/chipsets/:id",
  asyncHandler(async (req, res) => {
    const filter = buildIdFilter(req.params.id);
    const db = await getDb();
    const result = await db.collection("chipsets").deleteOne(filter);
    if (result.deletedCount === 0) throw new HttpError(404, "Chipset not found");
    res.json({ success: true });
  }),
);

// Models
app.get(
  "/api/models",
  asyncHandler(async (req, res) => {
    const category = req.query.category ? String(req.query.category) : null;
    const chipset = req.query.chipset ? String(req.query.chipset) : null;

    const filter = {};
    if (category) filter.category_name = category;
    if (chipset) filter.chipset_name = chipset;

    const db = await getDb();
    const models = await db.collection("models").find(filter).sort({ created_at: -1 }).toArray();
    res.json(models.map(toApiDoc));
  }),
);

app.get(
  "/api/models/:modelNumber",
  asyncHandler(async (req, res) => {
    const modelNumber = decodeURIComponent(req.params.modelNumber ?? "");
    if (!modelNumber) throw new HttpError(400, "modelNumber is required");

    const db = await getDb();
    const model = await db.collection("models").findOne({ model_number: modelNumber });
    if (!model) throw new HttpError(404, "Model not found");
    res.json(toApiDoc(model));
  }),
);

app.post(
  "/api/models",
  asyncHandler(async (req, res) => {
    const {
      category_name,
      type,
      chipset_name,
      model_number,
      prefix,
      telx_model_number,
      description,
      macs_per_serial,
      qty,
    } = req.body ?? {};

    if (!category_name || typeof category_name !== "string") throw new HttpError(400, "category_name is required");
    if (!type || typeof type !== "string") throw new HttpError(400, "type is required");
    if (!chipset_name || typeof chipset_name !== "string") throw new HttpError(400, "chipset_name is required");
    if (!model_number || typeof model_number !== "string") throw new HttpError(400, "model_number is required");
    if (!prefix || typeof prefix !== "string") throw new HttpError(400, "prefix is required");

    const db = await getDb();
    const doc = {
      category_name: category_name.trim(),
      type: type.trim(),
      chipset_name: chipset_name.trim(),
      model_number: model_number.trim(),
      prefix: prefix.trim(),
      telx_model_number: typeof telx_model_number === "string" ? telx_model_number.trim() : null,
      description: typeof description === "string" ? description.trim() : null,
      macs_per_serial: Number.isFinite(Number(macs_per_serial)) ? Number(macs_per_serial) : 1,
      qty: Number.isFinite(Number(qty)) ? Number(qty) : 0,
      last_serial: null,
      generated_count: 0,
      allocated_count: 0,
      created_at: nowIso(),
    };

    const result = await db.collection("models").insertOne(doc);
    res.status(201).json(toApiDoc({ _id: result.insertedId, ...doc }));
  }),
);

app.put(
  "/api/models/:modelNumber",
  asyncHandler(async (req, res) => {
    const modelNumber = decodeURIComponent(req.params.modelNumber ?? "");
    if (!modelNumber) throw new HttpError(400, "modelNumber is required");

    const {
      category_name,
      type,
      chipset_name,
      prefix,
      telx_model_number,
      description,
      macs_per_serial,
      qty,
    } = req.body ?? {};

    if (!category_name || typeof category_name !== "string") throw new HttpError(400, "category_name is required");
    if (!type || typeof type !== "string") throw new HttpError(400, "type is required");
    if (!chipset_name || typeof chipset_name !== "string") throw new HttpError(400, "chipset_name is required");
    if (!prefix || typeof prefix !== "string") throw new HttpError(400, "prefix is required");

    const update = {
      category_name: category_name.trim(),
      type: type.trim(),
      chipset_name: chipset_name.trim(),
      prefix: prefix.trim(),
      telx_model_number: typeof telx_model_number === "string" ? telx_model_number.trim() : null,
      description: typeof description === "string" ? description.trim() : null,
      macs_per_serial: Number.isFinite(Number(macs_per_serial)) ? Number(macs_per_serial) : 1,
    };
    if (qty !== undefined) {
      update.qty = Number.isFinite(Number(qty)) ? Number(qty) : 0;
    }

    const db = await getDb();
    const updatedModel = await db.collection("models").findOneAndUpdate(
      { model_number: modelNumber },
      { $set: update },
      { returnDocument: "after" },
    );
    if (!updatedModel) throw new HttpError(404, "Model not found");
    res.json(toApiDoc(updatedModel));
  }),
);

app.delete(
  "/api/models/:modelNumber",
  asyncHandler(async (req, res) => {
    const modelNumber = decodeURIComponent(req.params.modelNumber ?? "");
    if (!modelNumber) throw new HttpError(400, "modelNumber is required");

    const db = await getDb();
    const result = await db.collection("models").deleteOne({ model_number: modelNumber });
    if (result.deletedCount === 0) throw new HttpError(404, "Model not found");
    res.json({ success: true });
  }),
);

// Generate groups
app.get(
  "/api/generate-groups",
  asyncHandler(async (req, res) => {
    const modelNumber = req.query.model_number ? String(req.query.model_number) : null;
    if (!modelNumber) throw new HttpError(400, "model_number is required");

    const db = await getDb();
    const groups = await db
      .collection("generate_groups")
      .find({ model_number: modelNumber })
      .sort({ generated_at: -1 })
      .toArray();
    res.json(groups.map(toApiDoc));
  }),
);

app.post(
  "/api/generate",
  asyncHandler(async (req, res) => {
    const { model_number, count, regionId, prefix, suffix } = req.body ?? {};

    if (!model_number || typeof model_number !== "string") throw new HttpError(400, "model_number is required");
    if (!Number.isFinite(Number(count)) || Number(count) <= 0) throw new HttpError(400, "count must be > 0");
    // if (!regionId || typeof regionId !== "string") throw new HttpError(400, "regionId is required");
    const requestedPrefix =
      (typeof prefix === "string" && prefix.trim()) || (typeof suffix === "string" && suffix.trim()) || null;

    const db = await getDb();
    const client = await getMongoClient();
    const session = client.startSession();

    try {
      let createdGroup;
      let newLastSerial;
      let newLastMacHex;

      await session.withTransaction(async () => {
        const modelsCol = db.collection("models");
        const groupsCol = db.collection("generate_groups");
        const macCounterCol = db.collection("mac_counter");

        const model = await modelsCol.findOne({ model_number }, { session });
        if (!model) throw new HttpError(404, "Model not found");

        const modelPrefix = typeof model.prefix === "string" && model.prefix.trim() ? model.prefix.trim() : null;
        const effectivePrefix = modelPrefix || requestedPrefix;
        if (!effectivePrefix) {
          throw new HttpError(400, "prefix is required (set it on the model)");
        }

        const macCounter =
          (await macCounterCol.findOne({ _id: "global_mac_counter" }, { session })) ??
          (() => {
            throw new HttpError(500, "MAC counter not initialized");
          })();

        const lastMacHex = macCounter.last_mac_hex;
        const lastSerial = model.last_serial ?? null;
        const macsPerSerial = model.macs_per_serial ?? 1;

        const cleanSuffix = effectivePrefix.replace(/[^A-Za-z0-9]/g, "");
        const year = 25;
        const serialPrefix = `${cleanSuffix}${regionId}${year}`;

        const serialsData = [];
        let currentMacOffset = 0;
        const serialCount = Number(count);

        for (let i = 0; i < serialCount; i++) {
          const serialNumber = generateNextSerial(lastSerial, serialPrefix, i);
          const macIds = [];

          for (let j = 0; j < macsPerSerial; j++) {
            const mac = generateNextMac(lastMacHex, currentMacOffset);
            macIds.push(mac);
            currentMacOffset++;
          }

          serialsData.push({ serialNumber, macIds, allocated: false });
        }

        newLastSerial = serialsData[serialsData.length - 1].serialNumber;
        const totalMacsGenerated = serialCount * macsPerSerial;
        newLastMacHex = (parseInt(lastMacHex, 16) + totalMacsGenerated).toString(16).padStart(12, "0").toUpperCase();

        const updateModelResult = await modelsCol.updateOne(
          { _id: model._id },
          { $set: { last_serial: newLastSerial }, $inc: { generated_count: serialCount } },
          { session },
        );
        if (updateModelResult.matchedCount !== 1) throw new HttpError(500, "Failed to update model");

        const updateMacResult = await macCounterCol.updateOne(
          { _id: "global_mac_counter" },
          { $set: { last_mac_hex: newLastMacHex, updated_at: nowIso() } },
          { session },
        );
        if (updateMacResult.matchedCount !== 1) throw new HttpError(500, "Failed to update MAC counter");

        const groupDoc = {
          model_number: model.model_number,
          telx_model_number: model.telx_model_number ?? null,
          category_name: model.category_name,
          region_id: regionId,
          suffix: effectivePrefix,
          generated_at: nowIso(),
          serials: serialsData,
        };

        const insertResult = await groupsCol.insertOne(groupDoc, { session });
        createdGroup = toApiDoc({ _id: insertResult.insertedId, ...groupDoc });
      });

      res.status(201).json({
        success: true,
        group: createdGroup,
        lastSerial: newLastSerial,
        lastMacHex: newLastMacHex,
      });
    } finally {
      await session.endSession();
    }
  }),
);

app.post(
  "/api/allocate",
  asyncHandler(async (req, res) => {
    const { groupIds } = req.body ?? {};
    if (!Array.isArray(groupIds) || groupIds.length === 0) {
      throw new HttpError(400, "groupIds array is required");
    }

    const db = await getDb();
    const client = await getMongoClient();
    const session = client.startSession();

    try {
      let modelNumber;
      let allocatedCount = 0;

      await session.withTransaction(async () => {
        const groupsCol = db.collection("generate_groups");
        const modelsCol = db.collection("models");

        const ids = groupIds.map((id) => toObjectId(String(id)));
        const groups = await groupsCol.find({ _id: { $in: ids } }, { session }).toArray();
        if (groups.length === 0) throw new HttpError(404, "No groups found");

        modelNumber = groups[0]?.model_number;
        if (!modelNumber) throw new HttpError(500, "Missing model_number on group");

        await groupsCol.updateMany(
          { _id: { $in: ids } },
          { $set: { "serials.$[].allocated": true } },
          { session },
        );

        const agg = await groupsCol
          .aggregate(
            [
              { $match: { model_number: modelNumber } },
              { $unwind: "$serials" },
              { $match: { "serials.allocated": true } },
              { $count: "count" },
            ],
            { session },
          )
          .toArray();
        allocatedCount = agg[0]?.count ?? 0;

        await modelsCol.updateOne(
          { model_number: modelNumber },
          { $set: { allocated_count: allocatedCount } },
          { session },
        );
      });

      res.json({ success: true, message: "Groups allocated successfully", model_number: modelNumber, allocated_count: allocatedCount });
    } finally {
      await session.endSession();
    }
  }),
);

// Search
app.get(
  "/api/search",
  asyncHandler(async (req, res) => {
    const term = req.query.term ? String(req.query.term).trim() : "";
    if (!term) throw new HttpError(400, "Search term is required");

    const db = await getDb();
    const re = new RegExp(escapeRegex(term), "i");

    const [models, groups] = await Promise.all([
      db
        .collection("models")
        .find({ $or: [{ model_number: re }, { telx_model_number: re }] })
        .toArray(),
      db
        .collection("generate_groups")
        .find({ $or: [{ "serials.serialNumber": re }, { "serials.macIds": re }] })
        .sort({ generated_at: -1 })
        .toArray(),
    ]);

    res.json({ models: models.map(toApiDoc), groups: groups.map(toApiDoc) });
  }),
);

// Optional: fetch groups for frontend export
app.post(
  "/api/export-excel",
  asyncHandler(async (req, res) => {
    const { groupIds } = req.body ?? {};
    if (!Array.isArray(groupIds) || groupIds.length === 0) {
      throw new HttpError(400, "Invalid group IDs");
    }

    const db = await getDb();
    const ids = groupIds.map((id) => toObjectId(String(id)));
    const groups = await db.collection("generate_groups").find({ _id: { $in: ids } }).toArray();
    res.json({ groups: groups.map(toApiDoc) });
  }),
);

app.use((err, _req, res, _next) => {
  const status = err instanceof HttpError ? err.status : 500;

  if (err?.code === 11000) {
    return res.status(409).json({ error: "Duplicate key" });
  }

  const message = err instanceof Error ? err.message : "Unknown error";
  res.status(status).json({ error: message });
});

const port = Number(process.env.PORT || 3001);
const server = app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Mongo API listening on http://localhost:${port}`);
});

let mongoClientForShutdown = null;

async function initMongo() {
  try {
    mongoClientForShutdown = await getMongoClient();
    const db = await getDb();
    await ensureIndexes(db);
    await ensureMacCounter(db);
    // eslint-disable-next-line no-console
    console.log("MongoDB initialized");
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(
      "MongoDB init failed (API will still run, but /api/* requests will error until fixed):",
      error instanceof Error ? error.message : error,
    );
  }
}

initMongo();

async function shutdown() {
  server.close();
  try {
    await mongoClientForShutdown?.close();
  } catch {
    // ignore
  }
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
