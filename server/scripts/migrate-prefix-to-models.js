import "dotenv/config";

import { getDb, getMongoClient } from "../mongo.js";

function usageAndExit(code) {
  // eslint-disable-next-line no-console
  console.log(`Usage:
  node server/scripts/migrate-prefix-to-models.js [--unset-category-prefix]

What it does:
  - For each model missing \`prefix\`, copies it from its category's \`prefix\` (if present).
  - Optional: removes \`prefix\` from all categories afterwards.

Notes:
  - Requires MONGODB_URI (and optionally MONGODB_DB) in your environment/.env.
`);
  process.exit(code);
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    usageAndExit(0);
  }

  const unsetCategoryPrefix = process.argv.includes("--unset-category-prefix");

  const client = await getMongoClient();
  try {
    const db = await getDb();

    const categories = await db
      .collection("categories")
      .find({ prefix: { $type: "string", $ne: "" } })
      .project({ category_name: 1, prefix: 1 })
      .toArray();

    const prefixByCategoryName = new Map(
      categories
        .map((c) => [String(c.category_name ?? "").trim(), String(c.prefix ?? "").trim()])
        .filter(([name, prefix]) => Boolean(name) && Boolean(prefix)),
    );

    const modelsCol = db.collection("models");
    const cursor = modelsCol.find({
      $or: [{ prefix: { $exists: false } }, { prefix: null }, { prefix: "" }],
    });

    let updated = 0;
    let missingCategoryPrefix = 0;

    // eslint-disable-next-line no-restricted-syntax
    for await (const model of cursor) {
      const categoryName = String(model.category_name ?? "").trim();
      const prefix = prefixByCategoryName.get(categoryName);
      if (!prefix) {
        missingCategoryPrefix++;
        continue;
      }

      const result = await modelsCol.updateOne({ _id: model._id }, { $set: { prefix } });
      if (result.matchedCount === 1 && result.modifiedCount === 1) updated++;
    }

    // eslint-disable-next-line no-console
    console.log(`Updated models: ${updated}`);
    // eslint-disable-next-line no-console
    console.log(`Models still missing prefix (no category prefix found): ${missingCategoryPrefix}`);

    if (unsetCategoryPrefix) {
      const unsetResult = await db.collection("categories").updateMany({}, { $unset: { prefix: "" } });
      // eslint-disable-next-line no-console
      console.log(`Unset prefix on categories: matched=${unsetResult.matchedCount} modified=${unsetResult.modifiedCount}`);
    }
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

