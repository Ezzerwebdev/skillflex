/**
 * Generate a _plan.json from pack files.
 * Usage:
 *   node tools/gen_plan.js --root packs/year3/english/spelling --out packs/year3/english/spelling/_plan.json --chunk 5 --emoji "🔡" --title "Y3 · Spelling · Auto"
 */
const fs = require('fs'), path = require('path');

function arg(k, d){ const i=process.argv.indexOf(k); return i> -1 ? process.argv[i+1] : d; }
const ROOT = arg('--root'); if(!ROOT) throw new Error('--root required');
const OUT  = arg('--out', path.join(ROOT,'_plan.json'));
const CHUNK= parseInt(arg('--chunk','5'),10) || 5;
const EMOJI= arg('--emoji','🔡');
const TITLE= arg('--title','Auto Plan');
const UNIT_LABEL = arg('--unitLabel','Unit');
const STEP_LABEL = arg('--stepLabel','Step');

function humanize(file){ // fallback if pack has no title
  const base = path.basename(file).replace(/\.json$/,'').replace(/[-_]/g,' ');
  return base.charAt(0).toUpperCase()+base.slice(1);
}

function readSafe(fp){
  try{ return JSON.parse(fs.readFileSync(fp,'utf8')); }catch(_){ return null; }
}

function listFiles(dir){
  return fs.readdirSync(dir).filter(f=>f.endsWith('.json') && f!=='_plan.json')
    .map(f => path.join(dir,f));
}

function makeShortId(root, fullId){
  // fullId looks like "year3/english/spelling/ei-fill-the-gap-y3"
  // We want just the leaf filename (with .json)
  const leaf = fullId.split('/').pop();
  return leaf.endsWith('.json') ? leaf : leaf + '.json';
}

function deriveFullIdFromPath(fileAbs, root){
  // Convert packs/year3/english/spelling/ei-fill-the-gap-y3.json → year3/english/spelling/ei-fill-the-gap-y3
  const rel = path.relative('packs', fileAbs).replace(/\\/g,'/');
  return rel.replace(/\.json$/,'');
}

const files = listFiles(ROOT);
// Build list of {id,title}
const items = files.map(fp => {
  const json = readSafe(fp);
  const fullId = deriveFullIdFromPath(fp, ROOT);
  const title = json?.title || humanize(fp);
  return { id: fullId, title };
}).sort((a,b)=> String(a.title).localeCompare(String(b.title)) || String(a.id).localeCompare(String(b.id)));

const units=[];
for(let i=0;i<items.length;i+=CHUNK){
  const chunk=items.slice(i,i+CHUNK);
  units.push({
    id: `auto-u${units.length+1}`,
    title: `Unit ${units.length+1}`,
    emoji: EMOJI,
    lessons: chunk.map(x => ({ id: makeShortId(ROOT, x.id), title: x.title }))
  });
}

const out = {
  pathTitle: TITLE,
  unitLabel: UNIT_LABEL,
  stepLabel: STEP_LABEL,
  // Optional premium entry config (commented out; see Section B)
  // entry: { probeLesson: "review-ai-quick-check-y3.json", onScoreGte: 80, startUnitIndex: 2, startLessonIndex: 0 },
  units
};

fs.writeFileSync(OUT, JSON.stringify(out, null, 2)+'\n');
console.log('Wrote', OUT, 'units:', units.length);
