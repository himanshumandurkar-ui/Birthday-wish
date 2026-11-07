const {sb}=require("../../lib/supabase");
const {valid}=require("../../lib/auth");
module.exports=async(req,res)=>{
 if(!valid(req))return res.status(401).json({error:"Please log in again."});
 try{
  if(req.method==="GET"){
   const [profiles,settings]=await Promise.all([sb("profiles?select=slug,data&order=slug"),sb("site_settings?id=eq.1&select=default_slug")]);
   return res.status(200).json({profiles,defaultSlug:settings[0]?.default_slug||"vedika"});
  }
  if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
  const body=req.body||{}, action=body.action;
  if(action==="save"){
   const slug=String(body.slug||"");
   if(!/^[a-z0-9-]{1,40}$/.test(slug))return res.status(400).json({error:"Invalid profile."});
   const data=body.data||{};
   const allowed=["name","birthday","accent","heroEyebrow","heroTitle","heroLine","introA","introB","introText","bubbleTitle","bubbleSub","footerTitle","footerText","footerStrong","footerSmall","showLetterBubble","letter","photos"];
   const clean={}; allowed.forEach(k=>{if(k in data)clean[k]=data[k];});
   if(!Array.isArray(clean.photos))clean.photos=[];
   const existing=await sb(`profiles?slug=eq.${encodeURIComponent(slug)}&select=slug`);
   if(existing.length) await sb(`profiles?slug=eq.${encodeURIComponent(slug)}`,{method:"PATCH",headers:{"Prefer":"return=minimal"},body:JSON.stringify({data:clean})});
   else await sb("profiles",{method:"POST",headers:{"Prefer":"return=minimal"},body:JSON.stringify({slug,data:clean})});
   return res.status(200).json({ok:true});
  }
  if(action==="default"){
   await sb("site_settings?id=eq.1",{method:"PATCH",headers:{"Prefer":"return=minimal"},body:JSON.stringify({default_slug:String(body.slug)})});
   return res.status(200).json({ok:true});
  }
  if(action==="create"){
   const name=String(body.name||"").trim().slice(0,60); if(!name)return res.status(400).json({error:"Enter a name."});
   const base=name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,35)||"person";
   let slug=base,n=2; while((await sb(`profiles?slug=eq.${encodeURIComponent(slug)}&select=slug`)).length)slug=`${base}-${n++}`;
   const template=(await sb(`profiles?slug=eq.${encodeURIComponent(String(body.copyFrom||"vedika"))}&select=data`))[0]?.data||{};
   const data={...template,name,birthday:"",photos:[]};
   await sb("profiles",{method:"POST",headers:{"Prefer":"return=minimal"},body:JSON.stringify({slug,data})});
   return res.status(200).json({ok:true,slug});
  }
  if(action==="delete"){
   const slug=String(body.slug||"");
   const all=await sb("profiles?select=slug");
   if(all.length<=1)return res.status(400).json({error:"At least one profile must remain."});
   await sb(`profiles?slug=eq.${encodeURIComponent(slug)}`,{method:"DELETE"});
   const settings=await sb("site_settings?id=eq.1&select=default_slug");
   if(settings[0]?.default_slug===slug)await sb("site_settings?id=eq.1",{method:"PATCH",headers:{"Prefer":"return=minimal"},body:JSON.stringify({default_slug:all.find(x=>x.slug!==slug).slug})});
   return res.status(200).json({ok:true});
  }
  return res.status(400).json({error:"Unknown action."});
 }catch(e){return res.status(500).json({error:e.message});}
};
