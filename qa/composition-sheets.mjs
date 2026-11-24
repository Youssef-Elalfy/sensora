import sharp from "sharp";
const dir="qa/composition";
async function compare(locale,scenes,width,height,name){
 const margin=18,gap=10,caption=33;
 const boardWidth=width*2+margin*2+gap,boardHeight=margin*2+(height+caption+gap)*scenes.length;
 const layers=[];
 for(const [row,scene] of scenes.entries()){
  for(const [col,phase] of ["before","after"].entries()){
   const x=margin+col*(width+gap),y=margin+row*(height+caption+gap);
   const title=(scene==="first-breath"?"First Breath":scene[0].toUpperCase()+scene.slice(1))+"    /    "+phase.toUpperCase();
   const heading=Buffer.from('<svg width="'+width+'" height="'+caption+'"><text x="1" y="23" fill="#efded1" font-family="Arial" font-size="15">'+title+'</text></svg>');
   layers.push({input:heading,left:x,top:y});
   const input=await sharp(dir+"/"+phase+"/"+locale+"-"+scene+".png").resize(width,height,{fit:"contain",background:"#21131b"}).png().toBuffer();
   layers.push({input,left:x,top:y+caption});
  }
 }
 await sharp({create:{width:boardWidth,height:boardHeight,channels:3,background:"#1c1319"}}).composite(layers).jpeg({quality:90}).toFile(dir+"/"+name+".jpg");
}
await compare("en",["first-breath","ember","veil","lab","ritual"],540,338,"desktop-comparison");
await compare("ar",["veil","lab"],270,584,"phone-comparison");
const tiles=[];
for(const [i,w] of [1920,1600,1440,1280,1024,768,430,390].entries()){
 for(const [j,locale] of ["en","ar"].entries()){
  const input=await sharp(dir+"/after/"+locale+"-"+w+".jpg").resize(260,275,{fit:"contain",background:"#1c1319"}).png().toBuffer();
  tiles.push({input,left:(i%4)*264,top:(Math.floor(i/4)*2+j)*279});
 }
}
await sharp({create:{width:1052,height:1112,channels:3,background:"#1c1319"}}).composite(tiles).jpeg({quality:85}).toFile(dir+"/responsive.jpg");
