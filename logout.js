const {cookie}=require("../../lib/auth");
module.exports=(req,res)=>{res.setHeader("Set-Cookie",cookie("",0));res.status(200).json({ok:true});};