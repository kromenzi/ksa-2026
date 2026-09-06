from pathlib import Path

path = Path("api/system-health.ts")
text = path.read_text(encoding="utf-8")

anchor = "async function resourceHandler(req:any,res:any,resource:string){"
if anchor not in text:
    raise SystemExit("resourceHandler anchor not found")

storage_handler = r'''const DOCUMENT_STORAGE_BUCKET="board-uploads";
const DOCUMENT_STORAGE_MAX_BYTES=50*1024*1024;
const encodeStoragePath=(value:string)=>value.split("/").filter(Boolean).map(part=>encodeURIComponent(part)).join("/");
const isDocumentStoragePath=(value:string)=>/^documents\/[A-Za-z0-9_-]+\/[0-9]{4}-[0-9]{2}-[0-9]{2}\/[A-Za-z0-9._-]+$/.test(value);

async function documentStorageHandler(req:any,res:any){
  const user=await getAuthUser(req);
  const profile=user?await getProfile(req,user):null;
  if(!user||!profile||!profile.is_active)return json(res,401,{error:"Not authenticated"});
  if(req.method!=="POST")return json(res,405,{error:"Method not allowed"});

  const action=String(req.query?.action||"").trim();
  const body=req.body||{};

  if(action==="sign-upload"){
    if(!canWrite(profile,"documents","create"))return json(res,403,{error:"Insufficient permission"});
    const fileName=String(body.fileName||"").trim();
    const fileSize=Number(body.fileSize||0);
    if(!fileName)return json(res,422,{error:"File name is required"});
    if(!Number.isFinite(fileSize)||fileSize<=0)return json(res,422,{error:"Valid file size is required"});
    if(fileSize>DOCUMENT_STORAGE_MAX_BYTES)return json(res,413,{error:"File exceeds the 50MB upload limit"});

    const extensionMatch=fileName.toLowerCase().match(/(\.[a-z0-9]{1,16})$/);
    const extension=extensionMatch?.[1]||"";
    const objectPath=`documents/${user.id}/${new Date().toISOString().slice(0,10)}/${Date.now()}-${Math.random().toString(36).slice(2,10)}${extension}`;
    const response=await supabaseFetchForRequest(req,`/storage/v1/object/upload/sign/${DOCUMENT_STORAGE_BUCKET}/${encodeStoragePath(objectPath)}`,{
      method:"POST",
      headers:{"x-upsert":"false"},
      body:"{}",
    });
    const payload=await response.json().catch(()=>({}));
    if(!response.ok)return json(res,response.status,{error:payload?.message||payload?.error||"Unable to create signed upload URL"});
    const relativeUrl=String(payload?.url||"");
    if(!relativeUrl)return json(res,502,{error:"Storage did not return a signed upload URL"});
    const signedUrl=relativeUrl.startsWith("http")?relativeUrl:`${SUPABASE_URL}/storage/v1${relativeUrl.startsWith("/")?relativeUrl:`/${relativeUrl}`}`;
    return json(res,200,{bucket:DOCUMENT_STORAGE_BUCKET,path:objectPath,signedUrl,maxFileSize:DOCUMENT_STORAGE_MAX_BYTES});
  }

  if(action==="sign-read"){
    const objectPath=String(body.path||"").trim();
    if(!isDocumentStoragePath(objectPath))return json(res,422,{error:"Invalid document storage path"});
    const response=await supabaseFetchForRequest(req,`/storage/v1/object/sign/${DOCUMENT_STORAGE_BUCKET}/${encodeStoragePath(objectPath)}`,{
      method:"POST",
      body:JSON.stringify({expiresIn:900}),
    });
    const payload=await response.json().catch(()=>({}));
    if(!response.ok)return json(res,response.status,{error:payload?.message||payload?.error||"Unable to create signed file URL"});
    const relativeUrl=String(payload?.signedURL||payload?.signedUrl||"");
    if(!relativeUrl)return json(res,502,{error:"Storage did not return a signed file URL"});
    let signedUrl=relativeUrl.startsWith("http")?relativeUrl:`${SUPABASE_URL}/storage/v1${relativeUrl.startsWith("/")?relativeUrl:`/${relativeUrl}`}`;
    if(Boolean(body.download)){
      const fileName=String(body.fileName||"document").replace(/[\r\n]/g,"");
      signedUrl+=`${signedUrl.includes("?")?"&":"?"}download=${encodeURIComponent(fileName)}`;
    }
    return json(res,200,{signedUrl,expiresIn:900});
  }

  if(action==="delete"){
    if(!canWrite(profile,"documents","delete"))return json(res,403,{error:"Insufficient permission"});
    const objectPath=String(body.path||"").trim();
    if(!isDocumentStoragePath(objectPath))return json(res,422,{error:"Invalid document storage path"});
    const response=await supabaseFetchForRequest(req,`/storage/v1/object/${DOCUMENT_STORAGE_BUCKET}`,{
      method:"DELETE",
      body:JSON.stringify({prefixes:[objectPath]}),
    });
    const payload=await response.json().catch(()=>[]);
    if(!response.ok)return json(res,response.status,{error:payload?.message||payload?.error||"Unable to delete stored file"});
    return json(res,200,{ok:true,path:objectPath});
  }

  return json(res,400,{error:"Unknown document storage action"});
}

'''

text = text.replace(anchor, storage_handler + anchor, 1)

handler_anchor = '''export default async function handler(req:any,res:any){
  const resource=String(req.query?.resource||"").trim();
  if(resource&&RESOURCE_MAP[resource]) return resourceHandler(req,res,resource);'''
handler_replacement = '''export default async function handler(req:any,res:any){
  const resource=String(req.query?.resource||"").trim();
  if(resource==="document-storage") return documentStorageHandler(req,res);
  if(resource&&RESOURCE_MAP[resource]) return resourceHandler(req,res,resource);'''
if handler_anchor not in text:
    raise SystemExit("default handler anchor not found")
text = text.replace(handler_anchor, handler_replacement, 1)

path.write_text(text, encoding="utf-8")
