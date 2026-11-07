const {valid}=require("../../lib/auth");
const {storageUpload}=require("../../lib/supabase");
const crypto=require("crypto");
module.exports=async(req,res)=>{
 if(!valid(req))return res.status(401).json({error:"Please log in again."});
 if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
 try{
  const b=req.body?.fileBase64, type=String(req.body?.contentType||"");
  if(!b||!["image/jpeg","image/png","image/webp","image/gif"].includes(type))return res.status(400).json({error:"Choose a JPG, PNG, WEBP or GIF image."});
  const bytes=Buffer.from(b,"base64");
  if(bytes.length>10*1024*1024)return res.status(400).json({error:"Maximum image size is 10 MB."});
  const ext={"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/gif":"gif"}[type];
  const name=`${crypto.randomUUID()}.${ext}`;
  const url=await storageUpload(name,bytes,type);
  return res.status(200).json({src:url});
 }catch(e){return res.status(500).json({error:e.message});}
};