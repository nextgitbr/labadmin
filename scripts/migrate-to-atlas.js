#!/usr/bin/env node
/*
  MongoDB migration script: copy all collections from source DB to destination DB.
  Usage:
    node scripts/migrate-to-atlas.js --source "mongodb://localhost:27017/labadmin" --dest "mongodb+srv://USER:PASS@host/dbname"
*/

const { MongoClient } = require('mongodb');

function parseArg(name, defVal) {
  const idx = process.argv.findIndex((a) => a === `--${name}`);
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  return defVal;
}

(async () => {
  const sourceUri = parseArg('source', 'mongodb://localhost:27017/labadmin');
  const destUri = parseArg('dest', process.env.MONGODB_URI || '');

  if (!destUri) {
    console.error('Destination URI not provided. Pass --dest or set MONGODB_URI.');
    process.exit(1);
  }

  console.log('Starting MongoDB migration...');
  console.log('Source:', sourceUri);
  console.log('Dest  :', destUri.replace(/(:)([^:@/]+)(@)/, (m, p1, p2, p3) => `${p1}***${p3}`));

  const srcClient = new MongoClient(sourceUri, { maxPoolSize: 5 });
  const dstClient = new MongoClient(destUri, { maxPoolSize: 10 });

  try {
    await srcClient.connect();
    await dstClient.connect();
    const srcDb = srcClient.db();
    const dstDb = dstClient.db();

    const collections = await srcDb.listCollections({}, { nameOnly: true }).toArray();
    const names = collections
      .map((c) => c.name)
      .filter((n) => !n.startsWith('system.'));

    console.log(`Found ${names.length} collections to migrate.`);

    for (const name of names) {
      console.log(`\n==> Migrating collection: ${name}`);
      const srcCol = srcDb.collection(name);
      const dstCol = dstDb.collection(name);

      // Copy indexes (skip default _id_)
      try {
        const idxs = await srcCol.indexes();
        for (const idx of idxs) {
          if (idx.name === '_id_') continue;
          try {
            await dstCol.createIndex(idx.key, {
              name: idx.name,
              unique: idx.unique,
              sparse: idx.sparse,
              expireAfterSeconds: idx.expireAfterSeconds,
              background: true,
            });
          } catch (e) {
            console.warn(`  Index ${idx.name} create warning:`, e.message);
          }
        }
      } catch (e) {
        console.warn('  Could not copy indexes:', e.message);
      }

      const total = await srcCol.estimatedDocumentCount();
      console.log(`  Documents to migrate: ${total}`);

      const cursor = srcCol.find({}, { noCursorTimeout: true });
      const batchSize = 500;
      let batch = [];
      let processed = 0;

      while (await cursor.hasNext()) {
        const doc = await cursor.next();
        batch.push({
          updateOne: {
            filter: { _id: doc._id },
            update: { $set: doc },
            upsert: true,
          },
        });

        if (batch.length >= batchSize) {
          await dstCol.bulkWrite(batch, { ordered: false });
          processed += batch.length;
          console.log(`  Upserted ${processed}/${total}...`);
          batch = [];
        }
      }

      if (batch.length > 0) {
        await dstCol.bulkWrite(batch, { ordered: false });
        processed += batch.length;
        console.log(`  Upserted ${processed}/${total}...`);
      }

      console.log(`  Done collection: ${name}`);
    }

    console.log('\nMigration finished successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await srcClient.close().catch(() => {});
    await dstClient.close().catch(() => {});
  }
})();
