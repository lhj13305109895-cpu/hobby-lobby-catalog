// A single continuous PDF page. Photos and text share fixed coordinates;
// there are no spreadsheet drawing anchors or runtime image conversions.
const font=require('../data/pdf-font');
const ascii=text=>Uint8Array.from(String(text),c=>c.charCodeAt(0));
const number=value=>Number(value.toFixed(3)).toString();
function concatenate(parts){const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let at=0;for(const part of parts){out.set(part,at);at+=part.length;}return out;}
function decode64(value){
  const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',out=[];let bits=0,count=0;
  for(const char of value){if(char==='=')break;const n=alphabet.indexOf(char);if(n<0)continue;bits=(bits<<6)|n;count+=6;if(count>=8){count-=8;out.push((bits>>count)&255);}}
  return new Uint8Array(out);
}
function jpegSize(bytes){
  if(!bytes||bytes.length<4||bytes[0]!==255||bytes[1]!==216)throw new Error('Missing JPEG photo');
  let at=2;
  while(at+8<bytes.length){
    if(bytes[at]!==255)throw new Error('Invalid JPEG marker');
    const marker=bytes[at+1],length=(bytes[at+2]<<8)|bytes[at+3];
    if([192,193,194].includes(marker)){
      const height=(bytes[at+5]<<8)|bytes[at+6],width=(bytes[at+7]<<8)|bytes[at+8];
      if(!width||!height||bytes[at+9]!==3)throw new Error('Expected RGB JPEG photo');
      return {width,height};
    }
    if(length<2)throw new Error('Invalid JPEG segment');at+=2+length;
  }
  throw new Error('JPEG dimensions missing');
}
function glyphs(text){return Array.from(String(text),char=>{const glyph=font.glyphs[String(char.codePointAt(0))];if(!glyph)throw new Error('Unsupported PDF character: '+char);return glyph;});}
function textWidth(text,size){return glyphs(text).reduce((n,g)=>n+g[1],0)*size/1000;}
function hexText(text){return glyphs(text).map(g=>g[0].toString(16).padStart(4,'0')).join('').toUpperCase();}
function unicodeMap(){
  const unique=new Map();for(const [code,glyph] of Object.entries(font.glyphs))if(!unique.has(glyph[0]))unique.set(glyph[0],Number(code));
  const entries=[...unique].map(([id,code])=>'<'+id.toString(16).padStart(4,'0')+'> <'+code.toString(16).padStart(4,'0')+'>');
  let data='/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n/CMapName /HLSelectionUnicode def\n/CMapType 2 def\n1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n';
  for(let i=0;i<entries.length;i+=100){const part=entries.slice(i,i+100);data+=part.length+' beginbfchar\n'+part.join('\n')+'\nendbfchar\n';}
  return data+'endcmap\nCMapName currentdict /CMap defineresource pop\nend\nend';
}
function document(items,photos,lang){
  if(!items.length||photos.length!==items.length)throw new Error('Missing selection photos');
  const objects=[];
  const reserve=()=>{objects.push(null);return objects.length;};
  const add=content=>{const id=reserve();objects[id-1]=typeof content==='string'?ascii(content):content;return id;};
  const set=(id,content)=>{objects[id-1]=ascii(content);};
  const stream=(dictionary,bytes)=>add(concatenate([ascii('<< '+dictionary+' /Length '+bytes.length+' >>\nstream\n'),bytes,ascii('\nendstream')]));
  const catalog=reserve(),pages=reserve(),page=reserve();
  const fontBytes=decode64(font.base64),fontFile=stream('/Length1 '+fontBytes.length,fontBytes);
  const descriptor=add('<< /Type /FontDescriptor /FontName /'+font.name+' /Flags 4 /FontBBox ['+font.bbox.join(' ')+'] /ItalicAngle 0 /Ascent '+font.ascent+' /Descent '+font.descent+' /CapHeight '+font.ascent+' /StemV 80 /FontFile2 '+fontFile+' 0 R >>');
  const widths=new Map();for(const g of Object.values(font.glyphs))widths.set(g[0],g[1]);
  const cid=add('<< /Type /Font /Subtype /CIDFontType2 /BaseFont /'+font.name+' /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor '+descriptor+' 0 R /CIDToGIDMap /Identity /DW 1000 /W ['+[...widths].map(([id,width])=>id+' ['+width+']').join(' ')+'] >>');
  const cmap=stream('',ascii(unicodeMap()));
  const fontObject=add('<< /Type /Font /Subtype /Type0 /BaseFont /'+font.name+' /Encoding /Identity-H /DescendantFonts ['+cid+' 0 R] /ToUnicode '+cmap+' 0 R >>');
  const width=595.28,rowHeight=124,headerHeight=34,height=184+items.length*rowHeight;
  // PDF 1.6 UserUnit keeps even very long lists within the 14,400-unit page box.
  const unit=Math.max(1,Math.ceil(height/14000)),left=24,columns=[210,225,width-48-210-225];
  const tableWidth=width-48,tableTop=height-94,bodyTop=tableTop-headerHeight;
  const commands=['q '+(1/unit).toFixed(8)+' 0 0 '+(1/unit).toFixed(8)+' 0 0 cm'];
  const fill=(r,g,b)=>commands.push([r,g,b].map(number).join(' ')+' rg');
  const rectangle=(x,y,w,h)=>commands.push([x,y,w,h].map(number).join(' ')+' re f');
  function text(value,x,y,size,color=[0.19,0.17,0.16],align='left',maxWidth){
    if(maxWidth&&textWidth(value,size)>maxWidth)size=size*maxWidth/textWidth(value,size);
    const measured=textWidth(value,size);if(align==='center')x-=measured/2;else if(align==='right')x-=measured;
    fill(...color);commands.push('BT /F1 '+number(size)+' Tf 1 0 0 1 '+number(x)+' '+number(y)+' Tm <'+hexText(value)+'> Tj ET');
  }
  const red=[0.608,0.188,0.184],muted=[0.49,0.45,0.40],white=[1,1,1];
  text('HOBBY LOBBY / SELECTION',left,height-30,9.5,red);
  text(lang==='zh'?'选款清单':'Pattern selection',left,height-62,22);
  text(lang==='zh'?'共 '+items.length+' 项':items.length+' selected items',width-left,height-60,10.5,muted,'right');
  fill(...red);rectangle(left,bodyTop,tableWidth,headerHeight);
  const headings=lang==='zh'?[['照片'],['货号 / 容量 / 装箱量'],['数量（件）']]:[['Photo'],['Item No. / Capacity / Packing'],['Quantity','(cartons)']];
  let columnLeft=left;
  headings.forEach((lines,index)=>{lines.forEach((line,n)=>text(line,columnLeft+columns[index]/2,bodyTop+headerHeight/2+(lines.length-1)*6-n*12-4,lang==='zh'?11:9,white,'center',columns[index]-12));columnLeft+=columns[index];});
  const imageObjects=new Map(),resources=[];
  items.forEach((item,index)=>{
    if(!Number.isSafeInteger(item.quantity)||item.quantity<1)throw new Error('Invalid selection row');
    const photo=photos[index],dimensions=jpegSize(photo),key=item.productId||String(index);
    let image=imageObjects.get(key);
    if(!image){const id=stream('/Type /XObject /Subtype /Image /Width '+dimensions.width+' /Height '+dimensions.height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode',photo);image={id,name:'Im'+id,...dimensions};imageObjects.set(key,image);resources.push('/'+image.name+' '+id+' 0 R');}
    const bottom=bodyTop-(index+1)*rowHeight,center=bottom+rowHeight/2;
    if(index%2===1){fill(0.995,0.987,0.969);rectangle(left,bottom,tableWidth,rowHeight);}
    const scale=Math.min((columns[0]-16)/image.width,(rowHeight-12)/image.height),w=image.width*scale,h=image.height*scale;
    commands.push('q '+[w,0,0,h,left+(columns[0]-w)/2,bottom+(rowHeight-h)/2].map(number).join(' ')+' cm /'+image.name+' Do Q');
    const codeCenter=left+columns[0]+columns[1]/2;
    text(item.code,codeCenter,center+15,14,undefined,'center',columns[1]-16);
    text(item.offer.id,codeCenter,center-3,11.5,muted,'center');
    text(item.offer.pcsPerCarton+(lang==='zh'?' 只/件':' pcs/carton'),codeCenter,center-21,10.5,muted,'center');
    text(String(item.quantity),left+columns[0]+columns[1]+columns[2]/2,center-5,14,undefined,'center',columns[2]-12);
  });
  const bottom=bodyTop-items.length*rowHeight;
  commands.push('0.72 0.67 0.60 RG 0.6 w '+[left,bottom,tableWidth,headerHeight+items.length*rowHeight].map(number).join(' ')+' re S');
  for(let n=0;n<=items.length;n++){const y=bodyTop-n*rowHeight;commands.push(number(left)+' '+number(y)+' m '+number(left+tableWidth)+' '+number(y)+' l S');}
  let x=left;for(let i=0;i<columns.length-1;i++){x+=columns[i];commands.push(number(x)+' '+number(bottom)+' m '+number(x)+' '+number(tableTop)+' l S');}
  text(lang==='zh'?'本清单为选款参考，尚未提交订单。':'Selection reference only. No order has been placed.',left,24,9,muted);
  commands.push('Q');
  const content=stream('',ascii(commands.join('\n')));
  set(page,'<< /Type /Page /Parent '+pages+' 0 R /MediaBox [0 0 '+number(width/unit)+' '+number(height/unit)+'] /UserUnit '+unit+' /Resources << /Font << /F1 '+fontObject+' 0 R >> /XObject << '+resources.join(' ')+' >> >> /Contents '+content+' 0 R >>');
  set(pages,'<< /Type /Pages /Kids ['+page+' 0 R] /Count 1 >>');
  set(catalog,'<< /Type /Catalog /Pages '+pages+' 0 R /PageLayout /SinglePage /OpenAction ['+page+' 0 R /FitH '+number(height/unit)+'] >>');
  const parts=[ascii('%PDF-1.6\n'),new Uint8Array([37,226,227,207,211,10])],offsets=[0];let offset=parts.reduce((n,p)=>n+p.length,0);
  objects.forEach((object,index)=>{offsets.push(offset);const chunk=concatenate([ascii((index+1)+' 0 obj\n'),object,ascii('\nendobj\n')]);parts.push(chunk);offset+=chunk.length;});
  const xref=offset,table=['xref','0 '+(objects.length+1),'0000000000 65535 f ',...offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n ')].join('\n');
  parts.push(ascii(table+'\ntrailer\n<< /Size '+(objects.length+1)+' /Root '+catalog+' 0 R >>\nstartxref\n'+xref+'\n%%EOF\n'));
  return concatenate(parts).buffer;
}
module.exports={document};
