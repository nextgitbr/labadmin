const { Client } = require("pg");
const conn = process.env.PG_URI;
if (!conn) { console.error("PG_URI not set"); process.exit(1); }
const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
(async () => {
  try {
    await client.connect();
    const ping = await client.query("select now() as now");
    const tablesQ = `
      select table_schema, table_name
      from information_schema.tables
      where table_type='BASE TABLE'
        and table_schema not in ('pg_catalog','information_schema')
      order by table_schema, table_name
    `;
    const { rows: tables } = await client.query(tablesQ);
    console.log(JSON.stringify({ ok:true, now: ping.rows[0].now, count: tables.length, tables }, null, 2));

    const existsQ = `
      select table_schema, table_name
      from information_schema.tables
      where table_name = 'settings_app'
      limit 1
    `;
    const { rows: exists } = await client.query(existsQ);
    if (exists.length === 0) {
      console.log("settings_app not found");
    } else {
      const { rows: data } = await client.query('select * from settings_app limit 50');
      console.log("settings_app sample (up to 50 rows):");
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (e) {
    console.error("Connection failed:", e.message);
    process.exitCode = 1;
  } finally {
    await client.end().catch(()=>{});
  }
})();
