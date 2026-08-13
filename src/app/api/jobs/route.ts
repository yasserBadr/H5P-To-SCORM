import { randomBytes } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import Busboy from "busboy";
import { createJob, cleanupExpired } from "@/lib/jobs/storage";
import { extractAndValidate } from "@/lib/h5p/extractor";

export const runtime="nodejs";export const dynamic="force-dynamic";
export async function POST(request:Request){
 const max=Number(process.env.MAX_UPLOAD_SIZE_MB||1000)*1024*1024;const length=Number(request.headers.get("content-length")||0);if(length>max+1024*1024)return Response.json({error:"الملف أكبر من الحد المسموح."},{status:413});
 const type=request.headers.get("content-type")||"";if(!type.startsWith("multipart/form-data")||!request.body)return Response.json({error:"Invalid multipart upload"},{status:400});
 await cleanupExpired();const id=`job_${randomBytes(8).toString("hex")}`;const dir=await createJob(id);const archive=path.join(dir,"upload.h5p");let original="upload.h5p";
 try{
  await new Promise<void>((resolve,reject)=>{const bus=Busboy({headers:Object.fromEntries(request.headers),limits:{files:1,fileSize:max,fields:0}});let found=false;bus.on("file",(_name,file,info)=>{found=true;original=path.basename(info.filename||"upload.h5p");if(!original.toLowerCase().endsWith(".h5p")){file.resume();reject(new Error("Only .h5p files are supported"));return}const out=createWriteStream(archive,{flags:"wx"});file.on("limit",()=>reject(new Error("Upload exceeds configured size limit")));file.on("error",reject);out.on("error",reject);file.pipe(out)});bus.on("error",reject);bus.on("finish",()=>found?resolve():reject(new Error("No H5P file was uploaded")));Readable.fromWeb(request.body as never).pipe(bus)});
  const content=path.join(dir,"content");await mkdir(content);const parsed=await extractAndValidate(archive,content);const size=(await stat(archive)).size;const meta={...parsed,filename:original,size};await writeFile(path.join(dir,"meta.json"),JSON.stringify(meta));return Response.json({jobId:id,...meta},{status:201});
 }catch(e){await rm(dir,{recursive:true,force:true});return Response.json({error:e instanceof Error?e.message:"Unable to extract H5P package"},{status:422})}
}
