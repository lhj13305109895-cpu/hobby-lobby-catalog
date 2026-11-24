const fs=require('node:fs'),fsp=fs.promises,path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
const directory=path.join(__dirname,'32234-network-'+Date.now());fs.mkdirSync(directory,{recursive:true});
let downloads=0;
const downloadedBytes=new Map();
const fileSystem={
  readFile(options){fsp.readFile(options.filePath).then(bytes=>options.success({data:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)}),error=>options.fail({errMsg:error.message}));},
  writeFile(options){fsp.writeFile(options.filePath,Buffer.from(options.data)).then(()=>options.success({}),error=>options.fail({errMsg:error.message}));}
};
global.wx={env:{USER_DATA_PATH:directory.replace(/\\/g,'/')},getFileSystemManager:()=>fileSystem,
  downloadFile(options){
    const number=++downloads;
    (async()=>{
      const response=await fetch(options.url,{signal:AbortSignal.timeout(options.timeout)});
      const bytes=Buffer.from(await response.arrayBuffer());
      if(response.status===200)assert.match(response.headers.get('content-type'),/^image\/jpeg\b/);
      const tempFilePath=path.join(directory,'download-'+number+'.jpg');await fsp.writeFile(tempFilePath,bytes);
      downloadedBytes.set(new URL(options.url).pathname,bytes);
      options.success({statusCode:response.status,tempFilePath});
    })().catch(error=>options.fail({errMsg:error.message+(error.cause?.code?' '+error.cause.code:'')}));
  }
};
const catalogue=require(path.join(root,'miniprogram/utils/catalogue'));
const resources=require(path.join(root,'miniprogram/data/export-photos'));
const exporter=require(path.join(root,'miniprogram/utils/export-selection'));
const items=['318B-23','318B-22','322-34'].map(code=>{const product=catalogue.products.find(p=>p.code===code);assert.ok(product);return {...product,quantity:1,offer:product.offers[0]};});
(async()=>{
  const pdf=await exporter.createSelectionFile(items,'zh',undefined,'pdf');
  assert.equal((fs.readFileSync(pdf,'latin1').match(/\/Subtype \/Image\b/g)||[]).length,3);
  const xlsx=await exporter.createSelectionFile(items,'zh',undefined,'xlsx');
  const zip=fs.readFileSync(xlsx),media=[];let at=0;
  while(zip.readUInt32LE(at)===0x04034b50){const size=zip.readUInt32LE(at+18),length=zip.readUInt16LE(at+26),extra=zip.readUInt16LE(at+28),name=zip.toString('utf8',at+30,at+30+length),start=at+30+length+extra;if(name.startsWith('xl/media/'))media.push(zip.subarray(start,start+size));at=start+size;}
  assert.equal(media.length,3);assert.equal(downloads,3,'Second format must reuse the validated persistent cache');
  for(let i=0;i<items.length;i++)assert.deepEqual(media[i],downloadedBytes.get(resources[items[i].productId].remotePath));
  console.log(JSON.stringify({codes:items.map(item=>item.code),downloads,pdfImages:3,excelImages:3,cacheReused:true,pdf,xlsx},null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
