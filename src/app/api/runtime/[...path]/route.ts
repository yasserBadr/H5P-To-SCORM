import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
export const runtime="nodejs";
const types:Record<string,string>={".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".woff":"font/woff",".woff2":"font/woff2",".png":"image/png",".svg":"image/svg+xml"};
export async function GET(_request:Request,{params}:{params:Promise<{path:string[]}>}){const p=await params;const root=path.resolve(process.cwd(),"node_modules","h5p-standalone","dist");const target=path.resolve(root,...p.path);if(!target.startsWith(root+path.sep))return new Response("Not found",{status:404});try{const info=await stat(target);if(!info.isFile())throw new Error();return new Response(Readable.toWeb(createReadStream(target)) as ReadableStream,{headers:{"content-type":types[path.extname(target)]||"application/octet-stream","content-length":String(info.size),"cache-control":"public, max-age=31536000, immutable"}})}catch{return new Response("Not found",{status:404})}}
