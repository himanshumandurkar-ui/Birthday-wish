const crypto=require("crypto");
const secret=()=>process.env.SESSION_SECRET||"";
function sign(value){return crypto.createHmac("sha256",secret()).update(value).digest("hex");}
function createCookie(){
 const payload=Buffer.from(JSON.stringify({exp:Date.now()+7*24*60*60*1000})).toString("base64url");
 return `${payload}.${sign(payload)}`;
}
function valid(req){
 if(!secret() || secret().length<32) return false;
 const raw=req.headers.cookie||"";
 const m=raw.match(/(?:^|;\s*)birthday_admin=([^;]+)/); if(!m)return false;
 const [payload,sig]=m[1].split("."); if(!payload||!sig)return false;
 const expected=sign(payload);
 try {
  if(!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return false;
  return JSON.parse(Buffer.from(payload,"base64url").toString()).exp>Date.now();
 } catch{return false;}
}
function cookie(value,maxAge=604800){
 return `birthday_admin=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}
module.exports={createCookie,valid,cookie};
