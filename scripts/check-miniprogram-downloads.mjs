import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';

const root=resolve(import.meta.dirname,'..');
const require=createRequire(import.meta.url);
const originalsOnly=process.argv.includes('--originals');
const thumbnailMode=process.argv.includes('--thumbnails')||originalsOnly;
const manifest=require(resolve(root,'miniprogram/data/'+(thumbnailMode?'thumbnails':'export-photos')+'.js'));
const config=require(resolve(root,'src/miniprogram/config.js'));
const origin=config.exportPhotoOrigin || config.assetOrigin;
const resources=Object.values(manifest).filter(row=>!row.package&&!row.local&&(!originalsOnly||row.original));
const records=new Map(resources.map(row=>[row.remotePath||row.path,row]));
const unique=[...records.keys()];
const pending=[...unique],failures=[];
let checked=0;
if(process.argv.includes('--wait') && unique.length) {
  const path=unique[0],expected=await readFile(resolve(root,'public',path.slice(1)));
  const deadline=Date.now()+8*60*1000;
  let waiting=false;
  for(;;) {
    try {
      const response=await fetch(origin+path,{signal:AbortSignal.timeout(20000)});
      const actual=Buffer.from(await response.arrayBuffer());
      if(response.status===200 && actual.equals(expected))break;
    } catch(error) { /* The deployment may still be starting. */ }
    if(Date.now()>=deadline)throw new Error('Website JPEG deployment was not ready within eight minutes');
    if(!waiting){console.log('Waiting for the website JPEGs to become available...');waiting=true;}
    await new Promise(resolve=>setTimeout(resolve,10000));
  }
}
async function check() {
  while(pending.length) {
    const path=pending.pop();
    try {
      const original=records.get(path).original===true;
      if(!(original?/^\/assets\/catalogue\/[a-zA-Z0-9-]+-thumb\.webp$/:/^\/assets\/(selection-photos|miniprogram-thumbs)\/[a-f0-9]{24}\.jpg$/).test(path))throw new Error('Invalid website photo path');
      const expected=await readFile(resolve(root,'public',path.slice(1)));
      const response=await fetch(origin+path,{signal:AbortSignal.timeout(30000)});
      if(response.status!==200)throw new Error('HTTP '+response.status);
      const expectedType=original?'image/webp':'image/jpeg';
      if((response.headers.get('content-type')||'').split(';')[0].toLowerCase()!==expectedType)throw new Error('Expected '+expectedType+'; received '+response.headers.get('content-type'));
      const actual=Buffer.from(await response.arrayBuffer());
      if(!actual.equals(expected))throw new Error('Downloaded bytes differ from the prepared JPEG');
      if(!original&&!path.endsWith(createHash('sha256').update(actual).digest('hex').slice(0,24)+'.jpg'))throw new Error('Photo hash mismatch');
      checked++;
    } catch(error) {failures.push({path,error:error.message});}
  }
}
await Promise.all(Array.from({length:6},check));
console.log(JSON.stringify({origin,type:thumbnailMode?'thumbnails':'exportPhotos',photos:Object.keys(manifest).length,unique:unique.length,checked,failed:failures.length,failures:failures.slice(0,8)},null,2));
if(failures.length)process.exitCode=1;
