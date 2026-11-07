const {sb}=require("../lib/supabase");
module.exports=async (req,res)=>{
 if(req.method!=="GET") return res.status(405).json({error:"Method not allowed"});
 try{
  const ix=await sb("site_settings?id=eq.1&select=default_slug");
  const requested=String(req.query.for||"").toLowerCase();
  const slug=/^[a-z0-9-]{1,40}$/.test(requested)?requested:(ix[0]?.default_slug||"vedika");
  const rows=await sb(`profiles?slug=eq.${encodeURIComponent(slug)}&select=data`);
  if(!rows.length)return res.status(404).json({error:"Profile not found"});
  return res.status(200).json({slug,data:rows[0].data});
 }catch(e){return res.status(500).json({error:e.message});}
};
