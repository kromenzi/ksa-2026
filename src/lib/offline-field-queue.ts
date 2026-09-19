export type FieldQueueItem = {
  id:string;
  resource:string;
  payload:Record<string,any>;
  createdAt:string;
};

const DB_NAME="safety-board-field-v1";
const STORE="operations";

function openDb():Promise<IDBDatabase>{
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(DB_NAME,1);
    request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:"id"});};
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
}
export async function enqueueFieldOperation(resource:string,payload:Record<string,any>){
  const db=await openDb();
  const item:FieldQueueItem={id:crypto.randomUUID(),resource,payload,createdAt:new Date().toISOString()};
  await new Promise<void>((resolve,reject)=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).put(item);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});
  db.close(); return item;
}
export async function listFieldOperations():Promise<FieldQueueItem[]>{
  const db=await openDb();
  const rows=await new Promise<FieldQueueItem[]>((resolve,reject)=>{const tx=db.transaction(STORE,"readonly");const req=tx.objectStore(STORE).getAll();req.onsuccess=()=>resolve(req.result||[]);req.onerror=()=>reject(req.error);});
  db.close(); return rows.sort((a,b)=>a.createdAt.localeCompare(b.createdAt));
}
export async function deleteFieldOperation(id:string){
  const db=await openDb();
  await new Promise<void>((resolve,reject)=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).delete(id);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});
  db.close();
}
