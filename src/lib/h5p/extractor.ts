import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import yauzl from "yauzl";
import { prepareH5PPackage, type H5PDependency } from "./dependency-resolver";

type H5PJson={title?:string;mainLibrary?:string;preloadedDependencies?:H5PDependency[];dynamicDependencies?:H5PDependency[]};
const open=(file:string)=>new Promise<yauzl.ZipFile>((resolve,reject)=>yauzl.open(file,{lazyEntries:true,decodeStrings:true,validateEntrySizes:true},(e,z)=>e?reject(e):resolve(z)));
const entryStream=(zip:yauzl.ZipFile,e:yauzl.Entry)=>new Promise<NodeJS.ReadableStream>((resolve,reject)=>zip.openReadStream(e,(err,s)=>err||!s?reject(err||new Error("Unreadable ZIP entry")):resolve(s)));
export async function extractAndValidate(archive:string,destination:string){
 const zip=await open(archive);let files=0,total=0;
 await new Promise<void>((resolve,reject)=>{zip.on("error",reject);zip.on("end",resolve);zip.on("entry",async entry=>{try{files++;total+=entry.uncompressedSize;if(files>10000||total>5*1024*1024*1024)throw new Error("H5P package exceeds safe extraction limits");const normalized=entry.fileName.replace(/\\/g,"/");if(normalized.includes("\0")||normalized.startsWith("/")||/^[A-Za-z]:/.test(normalized)||normalized.split("/").includes(".."))throw new Error("Unsafe path in H5P package");const target=path.resolve(destination,...normalized.split("/").filter(Boolean));const root=path.resolve(destination)+path.sep;if(!target.startsWith(root))throw new Error("Unsafe path in H5P package");if(normalized.endsWith("/")){await mkdir(target,{recursive:true})}else{await mkdir(path.dirname(target),{recursive:true});await pipeline(await entryStream(zip,entry),createWriteStream(target,{flags:"wx"}))}zip.readEntry()}catch(e){zip.close();reject(e)}});zip.readEntry()});
 let h5p:H5PJson;try{h5p=JSON.parse(await readFile(path.join(destination,"h5p.json"),"utf8"))}catch{throw new Error("h5p.json is missing or invalid")}
 try{JSON.parse(await readFile(path.join(destination,"content","content.json"),"utf8"))}catch{throw new Error("content/content.json is missing or invalid")}
 if(h5p.mainLibrary!=="H5P.InteractiveVideo")throw new Error("This file is not H5P Interactive Video")
 await prepareH5PPackage(destination);
 const mainDependency=(h5p.preloadedDependencies||[]).find(dep=>dep.machineName===h5p.mainLibrary);
 const version=mainDependency?`${mainDependency.majorVersion}.${mainDependency.minorVersion}`:"version not declared";
 return {title:h5p.title||"Untitled Interactive Video",mainLibrary:h5p.mainLibrary,version};
}
