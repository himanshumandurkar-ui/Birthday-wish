const {createCookie,cookie}=require("../../lib/auth");
module.exports=async(req,res)=>{
 if(req.method==="GET"){return res.status(200).json({authenticated:require("../../lib/auth").valid(req)});}
 if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
 const pass=String(req.body?.password||"");
 if(!process.env.ADMIN_PASSWORD || !process.env.SESSION_SECRET || process.env.SESSION_SECRET.length<32)
  return res.status(500).json({error:"Set ADMIN_PASSWORD and SESSION_SECRET in Vercel environment variables."});
 if(pass!==process.env.ADMIN_PASSWORD)return res.status(401).json({error:"Incorrect password."});
 res.setHeader("Set-Cookie",cookie(createCookie()));
 return res.status(200).json({ok:true});
};
