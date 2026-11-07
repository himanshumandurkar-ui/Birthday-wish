const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
function ready(){ return !!(SUPABASE_URL && SERVICE_KEY); }
async function sb(path, options={}) {
  if (!ready()) throw new Error("Supabase is not configured. Add the required Vercel environment variables.");
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type":"application/json", ...(options.headers||{})
    }
  });
  const txt=await res.text();
  if(!res.ok) throw new Error(txt || `Supabase request failed (${res.status})`);
  return txt ? JSON.parse(txt) : null;
}
async function storageUpload(fileName, bytes, contentType) {
  const url = `${SUPABASE_URL}/storage/v1/object/birthday-photos/${fileName}`;
  const res=await fetch(url,{method:"POST",headers:{apikey:SERVICE_KEY,Authorization:`Bearer ${SERVICE_KEY}`,"Content-Type":contentType,"x-upsert":"true"},body:bytes});
  if(!res.ok) throw new Error(await res.text());
  return `${SUPABASE_URL}/storage/v1/object/public/birthday-photos/${fileName}`;
}
module.exports={sb,storageUpload,ready};