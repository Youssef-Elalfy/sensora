import sharp from "sharp";
const scenes=["first-breath","invisible","ember","veil","tidal","lab","ritual"];
async function sheet(files,output,cols,w,h) {
 const rows=Math.ceil(files.length/cols),gap=5;
 const tiles=await Promise.all(files.map(async(file,i)=>({
  input:await sharp("qa/"+file+".jpg").resize(w,h,{fit:"contain",background:"#170e14"}).png().toBuffer(),
  left:i%cols*(w+gap),top:Math.floor(i/cols)*(h+gap)
 })));
 await sharp({create:{width:cols*(w+gap)-gap,height:rows*(h+gap)-gap,channels:3,background:"#170e14"}}).composite(tiles).jpeg({quality:87}).toFile("qa/"+output+".jpg");
}
await sheet([...scenes.map(n=>"desktop-"+n),"cinematic/after/index-en-1440"],"desktop-review",2,540,338);
await sheet(["ar-390",...scenes.slice(1).map(n=>"ar-mobile-"+n),"cinematic/after/index-ar-390"],"arabic-review",4,244,528);
await sheet(["en-360","en-390","en-430","en-768","ar-360","ar-390","ar-430","ar-768"],"viewport-review",4,240,465);
await sheet(["beauty","front","side","macro","clay","wire"].map(n=>"model-"+n),"bottle-study",3,400,320);
await sheet(["before/hero","after/hero","before/veil","after/veil","before/tidal","after/tidal"].map(n=>"cinematic/"+n),"cinematic/comparison",2,560,350);
