// TEST ONLY: executes the application SQL in local SQLite after minimal dialect translation.
// This does NOT validate PostgreSQL advisory-lock behaviour, SDK bundling, or a Netlify deployment.
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
export function testDatabase() {
  const sqlite = new DatabaseSync(':memory:');
  const schema = fs.readFileSync(new URL('../netlify/database/migrations/202607280001_create_experiment_tables.sql',import.meta.url),'utf8')
    .replaceAll('BIGSERIAL PRIMARY KEY','INTEGER PRIMARY KEY AUTOINCREMENT');
  sqlite.exec(schema);
  const calls=[];
  async function query(sql,params=[]) {
    calls.push({sql,params});
    if(sql.includes('pg_advisory_xact_lock')) return {rows:[{pg_advisory_xact_lock:null}]};
    let translated=sql.replaceAll('::int','').replace(/ FOR UPDATE\b/g,'');
    const values=[];
    translated=translated.replace(/\$(\d+)/g,(_,n)=>{values.push(params[Number(n)-1]);return '?';});
    const normalized=values.map(v=>v===undefined?null:typeof v==='boolean'?Number(v):v);
    const statement=sqlite.prepare(translated);
    const rows=statement.all(...normalized).map(r=>({...r}));
    return {rows,rowCount:rows.length};
  }
  const pool={query,connect:async()=>({query,release(){}})};
  return {pool,calls,sqlite,close:()=>sqlite.close()};
}
