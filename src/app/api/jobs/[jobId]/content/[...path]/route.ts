import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { jobDir, validJobId } from "@/lib/jobs/storage";

export const runtime="nodejs";export const dynamic="force-dynamic";
const types:Record<string,string>={".json":"application/json; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".mp4":"video/mp4",".webm":"video/webm",".ogg":"audio/ogg",".mp3":"audio/mpeg",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".svg":"image/svg+xml",".woff":"font/woff",".woff2":"font/woff2"};
export async function GET(_request:Request,{params}:{params:Promise<{jobId:string;path:string[]}>}){const p=await params;if(!validJobId(p.jobId))return new Response("Not found",{status:404});const root=path.resolve(jobDir(p.jobId),"content");const target=path.resolve(root,...p.path);if(!target.startsWith(root+path.sep))return new Response("Not found",{status:404});try{const info=await stat(target);if(!info.isFile())throw new Error();return new Response(Readable.toWeb(createReadStream(target)) as ReadableStream,{headers:{"content-type":types[path.extname(target).toLowerCase()]||"application/octet-stream","content-length":String(info.size),"cache-control":"private, max-age=3600"}})}catch{return new Response("Not found",{status:404})}}
