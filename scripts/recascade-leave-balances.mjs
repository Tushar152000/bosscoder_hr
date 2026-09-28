/**
 * One-off: re-cascade leave balances created before the spill-over rule existed.
 * Wherever a capped pool's `used` exceeds its `total`, the excess is pushed down
 * its cascade chain (casual → privilege → unpaid, etc.) so no pool stays negative.
 *
 * Dry-run: node scripts/recascade-leave-balances.mjs --dry-run
 * Apply:   node scripts/recascade-leave-balances.mjs
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';

const DRY_RUN = process.argv.includes('--dry-run');
const __dir = dirname(fileURLToPath(import.meta.url));
for (const l of readFileSync(resolve(__dir,'../.env.local'),'utf8').split('\n')){const m=l.match(/^([^#=]+)=(.*)$/);if(m)process.env[m[1].trim()]=m[2].trim().replace(/^"|"$/g,'');}
const sa=JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT,'base64').toString('utf8'));
admin.initializeApp({credential:admin.credential.cert({...sa,privateKey:sa.private_key.replace(/\\n/g,'\n')})});
const db=admin.firestore();

const DEFAULT_TOTALS={casual:9,privilege:9,marriage:5,medical:10,unpaid:0,wfh:0};
const CASCADE={casual:['casual','privilege','unpaid'],privilege:['privilege','unpaid'],marriage:['marriage','unpaid'],medical:['medical','unpaid']};
const KEYS=['casual','privilege','marriage','medical','unpaid','wfh'];

const emps=new Map((await db.collection('hr_employees').get()).docs.map(d=>[d.data().employeeId,d.data().displayName]));
const bals=await db.collection('hr_leave_balances').get();
console.log(`\nMode: ${DRY_RUN?'DRY RUN (no writes)':'APPLY'} | ${bals.size} balance docs`);
console.log('─'.repeat(72));

let changed=0; const writes=[];
for(const doc of bals.docs){
  const x=doc.data();
  const pools={}; for(const k of KEYS) pools[k]={total:x[k]?.total??DEFAULT_TOTALS[k],used:x[k]?.used??0};
  const before=JSON.stringify(pools);
  // process capped pools in cascade priority order
  for(const P of ['casual','privilege','marriage','medical']){
    const cur=pools[P]; if(cur.total>0 && cur.used>cur.total){
      let remaining=cur.used-cur.total; cur.used=cur.total;
      const chain=CASCADE[P].slice(1);
      for(const nx of chain){ if(remaining<=0)break; const np=pools[nx];
        if(np.total===0){np.used+=remaining;remaining=0;}
        else{const take=Math.min(Math.max(0,np.total-np.used),remaining);np.used+=take;remaining-=take;}
      }
      if(remaining>0)pools[chain[chain.length-1]||'unpaid'] && (pools['unpaid'].used+=remaining);
    }
  }
  if(JSON.stringify(pools)!==before){
    changed++;
    const name=emps.get(x.employeeId)||x.employeeId;
    const summ=KEYS.filter(k=>JSON.stringify(pools[k])!==JSON.stringify({total:x[k]?.total??DEFAULT_TOTALS[k],used:x[k]?.used??0}))
      .map(k=>`${k} ${x[k]?.used??0}/${x[k]?.total??DEFAULT_TOTALS[k]} → ${pools[k].used}/${pools[k].total}`);
    console.log(`  ${name} [${doc.id}]\n     ${summ.join('\n     ')}`);
    writes.push({ref:doc.ref,pools});
  }
}
console.log('─'.repeat(72));
console.log(`${changed} balance(s) need re-cascading.`);
if(DRY_RUN){console.log('\nDry run — no writes.\n');process.exit(0);}
if(changed){let b=db.batch();let n=0;for(const w of writes){const payload={};for(const k of KEYS)payload[k]=w.pools[k];b.set(w.ref,payload,{merge:true});if(++n===400){await b.commit();b=db.batch();n=0;}}if(n)await b.commit();}
console.log(`\n✓ Done. ${changed} balance(s) updated.\n`);
process.exit(0);
