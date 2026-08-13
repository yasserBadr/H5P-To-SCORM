import { mkdir, readFile, rm, stat } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const ROOT=path.join(os.tmpdir(),"h5p-scorm");
export const validJobId=(id:string)=>/^job_[a-f0-9]{16}$/.test(id);
export function jobDir(id:string){if(!validJobId(id))throw new Error("Invalid job identifier");return path.join(ROOT,id)}
export async function createJob(id:string){const dir=jobDir(id);await mkdir(dir,{recursive:false});return dir}
export async function readMeta(id:string){return JSON.parse(await readFile(path.join(jobDir(id),"meta.json"),"utf8")) as {title:string;filename:string;size:number;mainLibrary:string;version:string}}
export async function cleanupExpired(){await mkdir(ROOT,{recursive:true});const ttl=Number(process.env.H5P_JOB_TTL_HOURS||6)*3600000;const {readdir}=await import("node:fs/promises");for(const name of await readdir(ROOT)){if(!validJobId(name))continue;try{const info=await stat(jobDir(name));if(Date.now()-info.mtimeMs>ttl)await rm(jobDir(name),{recursive:true,force:true})}catch{}}}
