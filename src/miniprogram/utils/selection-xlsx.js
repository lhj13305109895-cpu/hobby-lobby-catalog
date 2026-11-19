// Small, dependency-free OOXML writer for the native WeChat runtime.
// Pictures use matching cell anchors and absolute transforms for mobile readers.
const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const NS = 'http://schemas.openxmlformats.org/';
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function utf8(text) {
  const bytes=[];
  for(const char of text) {
    const c=char.codePointAt(0);
    if(c<128)bytes.push(c);
    else if(c<2048)bytes.push(192|(c>>6),128|(c&63));
    else if(c<65536)bytes.push(224|(c>>12),128|((c>>6)&63),128|(c&63));
    else bytes.push(240|(c>>18),128|((c>>12)&63),128|((c>>6)&63),128|(c&63));
  }
  return new Uint8Array(bytes);
}
const crcTable=Array.from({length:256},(_,n)=>{let c=n;for(let b=0;b<8;b++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
function crc32(bytes){let c=0xffffffff;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
function zip(entries) {
  const localParts=[],centralParts=[];let offset=0;
  entries.forEach(entry=>{
    const name=utf8(entry.name),bytes=typeof entry.content==='string'?utf8(entry.content):entry.content;
    const local=new Uint8Array(30+name.length),l=new DataView(local.buffer);
    const crc=crc32(bytes);
    l.setUint32(0,0x04034b50,true);l.setUint16(4,20,true);l.setUint16(6,0x800,true);l.setUint16(12,33,true);
    l.setUint32(14,crc,true);l.setUint32(18,bytes.length,true);l.setUint32(22,bytes.length,true);l.setUint16(26,name.length,true);local.set(name,30);
    localParts.push(local,bytes);
    const central=new Uint8Array(46+name.length),c=new DataView(central.buffer);
    c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x800,true);c.setUint16(14,33,true);
    c.setUint32(16,crc,true);c.setUint32(20,bytes.length,true);c.setUint32(24,bytes.length,true);c.setUint16(28,name.length,true);c.setUint32(42,offset,true);central.set(name,46);
    centralParts.push(central);offset+=local.length+bytes.length;
  });
  const centralSize=centralParts.reduce((n,p)=>n+p.length,0),end=new Uint8Array(22),e=new DataView(end.buffer);
  e.setUint32(0,0x06054b50,true);e.setUint16(8,entries.length,true);e.setUint16(10,entries.length,true);e.setUint32(12,centralSize,true);e.setUint32(16,offset,true);
  const result=new Uint8Array(offset+centralSize+end.length);let at=0;
  localParts.concat(centralParts,[end]).forEach(p=>{result.set(p,at);at+=p.length;});return result.buffer;
}
const str=(ref,value,style)=>`<c r="${ref}" t="inlineStr" s="${style||0}"><is><t xml:space="preserve">${escape(value)}</t></is></c>`;
const num=(ref,value,style)=>`<c r="${ref}" s="${style||0}"><v>${value}</v></c>`;
function workbook(items,photos,lang) {
  if(!items.length || photos.length!==items.length)throw new Error('Missing product photos');
  const headings=lang==='zh'?['照片','货号 / 容量 / 装箱量','数量（件）']:['Photo','Item No. / Capacity / Packing','Quantity (cartons)'];
  const rowXml=[`<row r="1" ht="32" customHeight="1">${headings.map((s,i)=>str('ABC'[i]+'1',s,1)).join('')}</row>`];
  const drawing=[],rels=[];
  const files=[];
  items.forEach((item,index)=>{
    const row=index+2,photo=photos[index];
    if(!photo || !photo.length || !Number.isSafeInteger(item.quantity) || item.quantity<1)throw new Error('Invalid selection row');
    rowXml.push(`<row r="${row}" ht="144" customHeight="1">${str('A'+row,'')}${str('B'+row,item.code+'\n'+item.offer.id+'\n'+item.offer.pcsPerCarton+(lang==='zh'?' 只/件':' pcs/carton'))}${num('C'+row,item.quantity)}</row>`);
    // 232×174px inside a 192px row. Some mobile previewers use a:xfrm
    // instead of cell markers; both representations must describe the same box.
    const left=76200,top=85725,width=2209800,height=1657350;
    const sheetTop=32*12700+index*144*12700+top;
    const marker=(tag,x,y)=>`<xdr:${tag}><xdr:col>0</xdr:col><xdr:colOff>${x}</xdr:colOff><xdr:row>${row-1}</xdr:row><xdr:rowOff>${y}</xdr:rowOff></xdr:${tag}>`;
    drawing.push(`<xdr:twoCellAnchor editAs="oneCell">${marker('from',left,top)}${marker('to',left+width,top+height)}<xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${index+1}" name="${escape(item.code+' '+item.offer.id+' #'+(index+1))}" descr="${escape(item.code+' '+item.offer.id)}"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId${index+1}" cstate="print"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="${left}" y="${sheetTop}"/><a:ext cx="${width}" cy="${height}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:twoCellAnchor>`);
    rels.push(`<Relationship Id="rId${index+1}" Type="${NS}officeDocument/2006/relationships/image" Target="../media/image${index+1}.jpg"/>`);
    files.push({name:`xl/media/image${index+1}.jpg`,content:photo});
  });
  const relationships=content=>XML+`<Relationships xmlns="${NS}package/2006/relationships">${content}</Relationships>`;
  const relationship=(id,type,target)=>`<Relationship Id="${id}" Type="${NS}officeDocument/2006/relationships/${type}" Target="${target}"/>`;
  const styles=XML+`<styleSheet xmlns="${NS}spreadsheetml/2006/main"><fonts count="2"><font><sz val="12"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="12"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF9B302F"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left style="thin"><color rgb="FF000000"/></left><right style="thin"><color rgb="FF000000"/></right><top style="thin"><color rgb="FF000000"/></top><bottom style="thin"><color rgb="FF000000"/></bottom></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  const sheet=XML+`<worksheet xmlns="${NS}spreadsheetml/2006/main" xmlns:r="${NS}officeDocument/2006/relationships"><dimension ref="A1:C${items.length+1}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols><col min="1" max="1" width="34.72" customWidth="1"/><col min="2" max="2" width="30" customWidth="1"/><col min="3" max="3" width="18" customWidth="1"/></cols><sheetData>${rowXml.join('')}</sheetData><pageMargins left="0.25" right="0.25" top="0.4" bottom="0.4" header="0.2" footer="0.2"/><drawing r:id="rId1"/></worksheet>`;
  const type=(part,type)=>`<Override PartName="/${part}" ContentType="application/vnd.openxmlformats-officedocument.${type}"/>`;
  return zip([
    {name:'[Content_Types].xml',content:XML+`<Types xmlns="${NS}package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="jpg" ContentType="image/jpeg"/>${type('xl/workbook.xml','spreadsheetml.sheet.main+xml')}${type('xl/worksheets/sheet1.xml','spreadsheetml.worksheet+xml')}${type('xl/styles.xml','spreadsheetml.styles+xml')}${type('xl/drawings/drawing1.xml','drawing+xml')}</Types>`},
    {name:'_rels/.rels',content:relationships(relationship('rId1','officeDocument','xl/workbook.xml'))},
    {name:'xl/workbook.xml',content:XML+`<workbook xmlns="${NS}spreadsheetml/2006/main" xmlns:r="${NS}officeDocument/2006/relationships"><sheets><sheet name="${lang==='zh'?'选款清单':'Selection'}" sheetId="1" r:id="rId1"/></sheets></workbook>`},
    {name:'xl/_rels/workbook.xml.rels',content:relationships(relationship('rId1','worksheet','worksheets/sheet1.xml')+relationship('rId2','styles','styles.xml'))},
    {name:'xl/styles.xml',content:styles},{name:'xl/worksheets/sheet1.xml',content:sheet},
    {name:'xl/worksheets/_rels/sheet1.xml.rels',content:relationships(relationship('rId1','drawing','../drawings/drawing1.xml'))},
    {name:'xl/drawings/drawing1.xml',content:XML+`<xdr:wsDr xmlns:xdr="${NS}drawingml/2006/spreadsheetDrawing" xmlns:a="${NS}drawingml/2006/main" xmlns:r="${NS}officeDocument/2006/relationships">${drawing.join('')}</xdr:wsDr>`},
    {name:'xl/drawings/_rels/drawing1.xml.rels',content:relationships(rels.join(''))},...files
  ]);
}
module.exports={workbook};
