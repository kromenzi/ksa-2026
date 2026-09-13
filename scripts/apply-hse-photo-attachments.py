from pathlib import Path


def replace_once(path: str, old: str, new: str):
    p = Path(path)
    text = p.read_text(encoding="utf-8")
    if old not in text:
        raise SystemExit(f"anchor not found in {path}: {old[:100]!r}")
    text = text.replace(old, new, 1)
    p.write_text(text, encoding="utf-8")

# -----------------------------------------------------------------------------
# Reuse the existing system-health Vercel function for private HSE image storage
# -----------------------------------------------------------------------------
path = "api/system-health.ts"
replace_once(path,
'''const isDocumentStoragePath=(value:string)=>/^documents\\/[A-Za-z0-9_-]+\\/[0-9]{4}-[0-9]{2}-[0-9]{2}\\/[A-Za-z0-9._-]+$/.test(value);
''',
'''const isDocumentStoragePath=(value:string)=>/^documents\\/[A-Za-z0-9_-]+\\/[0-9]{4}-[0-9]{2}-[0-9]{2}\\/[A-Za-z0-9._-]+$/.test(value);
const HSE_IMAGE_MAX_BYTES=10*1024*1024;
const HSE_IMAGE_SCOPES=new Set(["ncr","violation"]);
const isHseImageStoragePath=(value:string)=>/^hse-images\\/(ncr|violation)\\/[A-Za-z0-9_-]+\\/[0-9]{4}-[0-9]{2}-[0-9]{2}\\/[A-Za-z0-9._-]+$/.test(value);
const isReadableStoragePath=(value:string)=>isDocumentStoragePath(value)||isHseImageStoragePath(value);
''')

replace_once(path,
'''  const action=String(req.query?.action||"").trim();
  const body=req.body||{};

  if(action==="sign-upload"){
''',
'''  const action=String(req.query?.action||"").trim();
  const body=req.body||{};

  if(action==="sign-image-upload"){
    if(!["admin","manager","editor"].includes(String(profile.role||"")))return json(res,403,{error:"Insufficient permission"});
    const scope=String(body.scope||"").trim().toLowerCase();
    const fileName=String(body.fileName||"").trim();
    const fileType=String(body.fileType||"").trim().toLowerCase();
    const fileSize=Number(body.fileSize||0);
    if(!HSE_IMAGE_SCOPES.has(scope))return json(res,422,{error:"Invalid HSE image scope"});
    if(!fileName)return json(res,422,{error:"File name is required"});
    if(!fileType.startsWith("image/"))return json(res,415,{error:"Only image files are allowed"});
    if(!Number.isFinite(fileSize)||fileSize<=0)return json(res,422,{error:"Valid image size is required"});
    if(fileSize>HSE_IMAGE_MAX_BYTES)return json(res,413,{error:"Image exceeds the 10MB upload limit"});
    const extensionMatch=fileName.toLowerCase().match(/(\\.[a-z0-9]{1,10})$/);
    const extension=extensionMatch?.[1]||"";
    const objectPath=`hse-images/${scope}/${user.id}/${new Date().toISOString().slice(0,10)}/${Date.now()}-${Math.random().toString(36).slice(2,10)}${extension}`;
    const response=await supabaseFetchForRequest(req,`/storage/v1/object/upload/sign/${DOCUMENT_STORAGE_BUCKET}/${encodeStoragePath(objectPath)}`,{
      method:"POST",headers:{"x-upsert":"false"},body:"{}",
    });
    const payload=await response.json().catch(()=>({}));
    if(!response.ok)return json(res,response.status,{error:payload?.message||payload?.error||"Unable to create signed image upload URL"});
    const relativeUrl=String(payload?.url||"");
    if(!relativeUrl)return json(res,502,{error:"Storage did not return a signed upload URL"});
    const signedUrl=relativeUrl.startsWith("http")?relativeUrl:`${SUPABASE_URL}/storage/v1${relativeUrl.startsWith("/")?relativeUrl:`/${relativeUrl}`}`;
    return json(res,200,{bucket:DOCUMENT_STORAGE_BUCKET,path:objectPath,signedUrl,maxFileSize:HSE_IMAGE_MAX_BYTES});
  }

  if(action==="sign-upload"){
''')

replace_once(path,
'''    if(!isDocumentStoragePath(objectPath))return json(res,422,{error:"Invalid document storage path"});
    const response=await supabaseFetchForRequest(req,`/storage/v1/object/sign/${DOCUMENT_STORAGE_BUCKET}/${encodeStoragePath(objectPath)}`,{
''',
'''    if(!isReadableStoragePath(objectPath))return json(res,422,{error:"Invalid storage path"});
    const response=await supabaseFetchForRequest(req,`/storage/v1/object/sign/${DOCUMENT_STORAGE_BUCKET}/${encodeStoragePath(objectPath)}`,{
''')

replace_once(path,
'''  if(action==="delete"){
    if(!canWrite(profile,"documents","delete"))return json(res,403,{error:"Insufficient permission"});
''',
'''  if(action==="delete-hse-image"){
    const objectPath=String(body.path||"").trim();
    if(!isHseImageStoragePath(objectPath))return json(res,422,{error:"Invalid HSE image storage path"});
    const ownerId=objectPath.split("/")[2]||"";
    if(!["admin","manager"].includes(String(profile.role||""))&&ownerId!==String(user.id))return json(res,403,{error:"Insufficient permission"});
    const response=await supabaseFetchForRequest(req,`/storage/v1/object/${DOCUMENT_STORAGE_BUCKET}`,{
      method:"DELETE",body:JSON.stringify({prefixes:[objectPath]}),
    });
    const payload=await response.json().catch(()=>[]);
    if(!response.ok)return json(res,response.status,{error:payload?.message||payload?.error||"Unable to delete stored image"});
    return json(res,200,{ok:true,path:objectPath});
  }

  if(action==="delete"){
    if(!canWrite(profile,"documents","delete"))return json(res,403,{error:"Insufficient permission"});
''')

# -----------------------------------------------------------------------------
# Employee violations: max four private photos + automatic print layout
# -----------------------------------------------------------------------------
path = "src/pages/admin/employee-violations.tsx"
replace_once(path,
'''import { apiRequest } from "@/lib/queryClient";
''',
'''import { apiRequest } from "@/lib/queryClient";
import { HseImagePicker } from "@/components/hse-image-picker";
import { deleteHseImages, resolveHseImageUrls, uploadHseImages, type HseStoredImage } from "@/lib/hse-image-storage";
''')
replace_once(path,
'''  isSameViolationRepeat: boolean;
}
''',
'''  isSameViolationRepeat: boolean;
  data?: Record<string, any>;
  images?: HseStoredImage[];
}
''')
replace_once(path,
'''  const [form, setForm] = useState(initialForm);
  const canDelete = currentUser?.role === "admin" || currentUser?.role === "manager";
''',
'''  const [form, setForm] = useState(initialForm);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const canDelete = currentUser?.role === "admin" || currentUser?.role === "manager";
''')
replace_once(path,
'''          severity: item.severity || item.data?.severity || "medium",
          repeatCount,
''',
'''          severity: item.severity || item.data?.severity || "medium",
          data: item.data && typeof item.data === "object" ? item.data : {},
          images: Array.isArray(item.data?.images) ? item.data.images.slice(0, 4) : [],
          repeatCount,
''')
replace_once(path,
'''    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/employee-violations", {
        ...form,
        refNo: `VIO-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`,
        status: "open",
      });
      return response.json();
    },
''',
'''    mutationFn: async () => {
      let uploaded: HseStoredImage[] = [];
      try {
        uploaded = await uploadHseImages(photoFiles, "violation");
        const response = await apiRequest("POST", "/api/employee-violations", {
          ...form,
          refNo: `VIO-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`,
          status: "open",
          data: {
            department: form.department,
            occupation: form.occupation,
            notes: form.notes,
            severity: form.severity,
            images: uploaded,
          },
        });
        return response.json();
      } catch (error) {
        if (uploaded.length) await deleteHseImages(uploaded).catch(() => undefined);
        throw error;
      }
    },
''')
replace_once(path,
'''      setForm(initialForm());
      setIsCreateOpen(false);
''',
'''      setForm(initialForm());
      setPhotoFiles([]);
      setIsCreateOpen(false);
''')
replace_once(path,
'''    mutationFn: async (item: ViolationRecord) => {
      const response = await apiRequest("DELETE", `/api/employee-violations/${encodeURIComponent(item.id)}`);
      return response.json();
    },
''',
'''    mutationFn: async (item: ViolationRecord) => {
      const response = await apiRequest("DELETE", `/api/employee-violations/${encodeURIComponent(item.id)}`);
      const payload = await response.json();
      if (item.images?.length) await deleteHseImages(item.images).catch(() => undefined);
      return payload;
    },
''')
replace_once(path,
'''  const handlePrintViolation = (item: ViolationRecord) => {
    const printWindow = window.open("", "_blank", "width=900,height=1100");
''',
'''  const handlePrintViolation = async (item: ViolationRecord) => {
    const printWindow = window.open("", "_blank", "width=900,height=1100");
''')
replace_once(path,
'''    const dir = isAr ? "rtl" : "ltr";
    printWindow.document.write(`<!doctype html>
''',
'''    const dir = isAr ? "rtl" : "ltr";
    const images = await resolveHseImageUrls(item.images || []);
    const imageColumns = images.length === 1 ? "1fr" : "1fr 1fr";
    const imageHeight = images.length === 1 ? "245px" : "165px";
    const imagesHtml = images.length ? `
      <div class="photos wide">
        <span class="label">${t("صور الإثبات", "Evidence Photos")}</span>
        <div class="photo-grid" style="grid-template-columns:${imageColumns}">
          ${images.map((src, index) => `<div class="photo" style="height:${imageHeight};${images.length === 3 && index === 2 ? "grid-column:1/-1;" : ""}"><img src="${escapeHtml(src)}" alt="Photo ${index + 1}" /></div>`).join("")}
        </div>
      </div>` : "";
    printWindow.document.write(`<!doctype html>
''')
replace_once(path,
'''  .value { white-space: pre-wrap; font-size: 14px; font-weight: 600; }
  .footer { margin-top: 30px; font-size: 11px; color: #64748b; text-align: center; }
''',
'''  .value { white-space: pre-wrap; font-size: 14px; font-weight: 600; }
  .photos { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; page-break-inside: avoid; }
  .photo-grid { display: grid; gap: 8px; margin-top: 8px; }
  .photo { border: 1px solid #dbe3ec; border-radius: 7px; overflow: hidden; background: #f8fafc; display: flex; align-items: center; justify-content: center; }
  .photo img { width: 100%; height: 100%; object-fit: contain; }
  .footer { margin-top: 30px; font-size: 11px; color: #64748b; text-align: center; }
''')
replace_once(path,
'''    <div class="field wide"><span class="label">${t("الملاحظات", "Notes")}</span><div class="value">${escapeHtml(item.notes || "—")}</div></div>
  </div>
''',
'''    <div class="field wide"><span class="label">${t("الملاحظات", "Notes")}</span><div class="value">${escapeHtml(item.notes || "—")}</div></div>
    ${imagesHtml}
  </div>
''')
replace_once(path,
'''              <div className="flex justify-end gap-2 sm:col-span-2">
''',
'''              <div className="sm:col-span-2 rounded-lg border p-3">
                <HseImagePicker files={photoFiles} onChange={setPhotoFiles} isAr={isAr} disabled={createMutation.isPending} label={t("صور إثبات المخالفة", "Violation Evidence Photos")} />
              </div>
              <div className="flex justify-end gap-2 sm:col-span-2">
''')
replace_once(path,
'''onClick={() => handlePrintViolation(item)}''',
'''onClick={() => void handlePrintViolation(item)}''')

# -----------------------------------------------------------------------------
# New NCR creation: max four private photos and live A4 automatic layout
# -----------------------------------------------------------------------------
path = "src/pages/admin/ncr/new-fixed.tsx"
replace_once(path,
'''import { ArrowLeft, Save, Send, Eye, RefreshCw } from "lucide-react";
''',
'''import { ArrowLeft, Save, Send, Eye, RefreshCw } from "lucide-react";
import { HseImagePicker } from "@/components/hse-image-picker";
import { deleteHseImages, uploadHseImages, type HseStoredImage } from "@/lib/hse-image-storage";
''')
replace_once(path,
'''function A4Preview({ form, isAr }: { form: FormState; isAr: boolean }) {
''',
'''function A4Preview({ form, isAr, images = [] }: { form: FormState; isAr: boolean; images?: string[] }) {
''')
replace_once(path,
'''          <section className="mt-3 overflow-hidden rounded-lg border border-emerald-200">
            <div className="bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">{isAr ? "ملاحظات التحقق والإغلاق" : "Verification / Closure Notes"}</div>
            <div className="min-h-[60px] whitespace-pre-wrap p-3 text-sm">{form.verificationNotes || "—"}</div>
          </section>
''',
'''          <section className="mt-3 overflow-hidden rounded-lg border border-emerald-200">
            <div className="bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">{isAr ? "ملاحظات التحقق والإغلاق" : "Verification / Closure Notes"}</div>
            <div className="min-h-[60px] whitespace-pre-wrap p-3 text-sm">{form.verificationNotes || "—"}</div>
          </section>

          {images.length > 0 && (
            <section className="mt-3 overflow-hidden rounded-lg border border-slate-200">
              <div className="bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">{isAr ? "صور الإثبات" : "Evidence Photos"}</div>
              <div className="grid grid-cols-2 gap-2 p-2">
                {images.map((src, index) => (
                  <div key={src} className={`flex items-center justify-center overflow-hidden rounded border bg-slate-50 ${images.length === 1 ? "col-span-2 h-52" : "h-28"} ${images.length === 3 && index === 2 ? "col-span-2" : ""}`}>
                    <img src={src} alt={`Evidence ${index + 1}`} className="h-full w-full object-contain" />
                  </div>
                ))}
              </div>
            </section>
          )}
''')
replace_once(path,
'''  const [form, setForm] = useState<FormState>(emptyForm);
''',
'''  const [form, setForm] = useState<FormState>(emptyForm);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  useEffect(() => {
    const urls = photoFiles.map((file) => URL.createObjectURL(file));
    setPhotoPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [photoFiles]);
''')
replace_once(path,
'''    const payload = {
      ...form,
      department: form.department.trim(),
      description: form.description.trim(),
      createdBy: currentUser?.id || "",
    };

    const response = await apiRequest("POST", "/api/ncr", payload);
    const created = await response.json();
    if (!created?.id) throw new Error(created?.error || (isAr ? "تعذر إنشاء التقرير" : "Unable to create NCR"));
    return created;
''',
'''    let uploaded: HseStoredImage[] = [];
    try {
      uploaded = await uploadHseImages(photoFiles, "ncr");
      const payload = {
        ...form,
        department: form.department.trim(),
        description: form.description.trim(),
        createdBy: currentUser?.id || "",
        image1: uploaded[0]?.path || null,
        image2: uploaded[1]?.path || null,
        image3: uploaded[2]?.path || null,
        image4: uploaded[3]?.path || null,
        sourceMetadata: uploaded.length ? { images: uploaded } : null,
      };

      const response = await apiRequest("POST", "/api/ncr", payload);
      const created = await response.json();
      if (!created?.id) throw new Error(created?.error || (isAr ? "تعذر إنشاء التقرير" : "Unable to create NCR"));
      return created;
    } catch (error) {
      if (uploaded.length) await deleteHseImages(uploaded).catch(() => undefined);
      throw error;
    }
''')
replace_once(path,
'''            <div className="space-y-2"><Label>{isAr ? "ملاحظات التحقق والإغلاق" : "Verification / Closure Notes"}</Label><Textarea rows={4} value={form.verificationNotes} onChange={(e) => setField("verificationNotes", e.target.value)} /></div>

            <div className="flex flex-col justify-end gap-2 border-t pt-4 sm:flex-row">
''',
'''            <div className="space-y-2"><Label>{isAr ? "ملاحظات التحقق والإغلاق" : "Verification / Closure Notes"}</Label><Textarea rows={4} value={form.verificationNotes} onChange={(e) => setField("verificationNotes", e.target.value)} /></div>

            <div className="rounded-lg border p-4">
              <HseImagePicker files={photoFiles} onChange={setPhotoFiles} isAr={isAr} disabled={saving || savingAndSending} label={isAr ? "صور إثبات عدم المطابقة" : "NCR Evidence Photos"} />
            </div>

            <div className="flex flex-col justify-end gap-2 border-t pt-4 sm:flex-row">
''')
replace_once(path,
'''{showPreview && <div className="sticky top-4 h-[680px] min-h-0 overflow-hidden rounded-lg border bg-slate-900 shadow-lg"><A4Preview form={form} isAr={isAr} /></div>}
''',
'''{showPreview && <div className="sticky top-4 h-[680px] min-h-0 overflow-hidden rounded-lg border bg-slate-900 shadow-lg"><A4Preview form={form} isAr={isAr} images={photoPreviews} /></div>}
''')

# -----------------------------------------------------------------------------
# NCR edit/detail: resolve private stored paths for visible thumbnails
# -----------------------------------------------------------------------------
path = "src/pages/admin/ncr/form.tsx"
replace_once(path,
'''import { useToast } from "@/hooks/use-toast";
''',
'''import { useToast } from "@/hooks/use-toast";
import { resolveHseImageUrls } from "@/lib/hse-image-storage";
''')
replace_once(path,
'''  const [showMobilePreview, setShowMobilePreview] = useState(false);
''',
'''  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [resolvedStoredImages, setResolvedStoredImages] = useState<string[]>([]);
''')
replace_once(path,
'''  const updateField = useCallback((field: string, value: any) => setFormData((prev: any) => ({ ...prev, [field]: value })), []);
''',
'''  useEffect(() => {
    let active = true;
    const values = [formData.image1, formData.image2, formData.image3, formData.image4];
    void resolveHseImageUrls(values).then((urls) => { if (active) setResolvedStoredImages(urls); });
    return () => { active = false; };
  }, [formData.image1, formData.image2, formData.image3, formData.image4]);

  const updateField = useCallback((field: string, value: any) => setFormData((prev: any) => ({ ...prev, [field]: value })), []);
''')
replace_once(path,
'''{imageSlots.map(slot => { const image = formData[`image${slot}`]; return <div key={slot}''',
'''{imageSlots.map(slot => { const image = resolvedStoredImages[slot - 1] || formData[`image${slot}`]; return <div key={slot}''')
replace_once(path,
'''images: [formData.image1,formData.image2,formData.image3,formData.image4], sections:''',
'''images: resolvedStoredImages.length ? resolvedStoredImages : [formData.image1,formData.image2,formData.image3,formData.image4], sections:''')

# -----------------------------------------------------------------------------
# Shared NCR print template: resolve private URLs + automatic 1/2/3/4 layout
# -----------------------------------------------------------------------------
path = "src/components/print-share-dialog.tsx"
replace_once(path,
'''import { useState, useCallback } from "react";
''',
'''import { useState, useCallback, useEffect, useMemo } from "react";
''')
replace_once(path,
'''import type { Module } from "@/lib/data-context";
''',
'''import type { Module } from "@/lib/data-context";
import { resolveHseImageUrls } from "@/lib/hse-image-storage";
''')
replace_once(path,
'''        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          ${ncrImages.map((src, idx) => `
            <div style="border:1px solid #d1d5db;border-radius:6px;height:130px;background:#f8fafc;display:flex;align-items:center;justify-content:center;overflow:hidden;page-break-inside:avoid;">
              <img src="${escapeHtml(src)}" alt="Image ${idx + 1}" style="max-width:100%;max-height:100%;object-fit:cover;" />
            </div>
          `).join("")}
        </div>
''',
'''        <div style="display:grid;grid-template-columns:${ncrImages.length === 1 ? "1fr" : "1fr 1fr"};gap:8px;">
          ${ncrImages.map((src, idx) => `
            <div style="border:1px solid #d1d5db;border-radius:6px;height:${ncrImages.length === 1 ? "240px" : "150px"};${ncrImages.length === 3 && idx === 2 ? "grid-column:1/-1;" : ""}background:#f8fafc;display:flex;align-items:center;justify-content:center;overflow:hidden;page-break-inside:avoid;">
              <img src="${escapeHtml(src)}" alt="Image ${idx + 1}" style="width:100%;height:100%;object-fit:contain;" />
            </div>
          `).join("")}
        </div>
''')
replace_once(path,
'''              <div className="grid grid-cols-2 gap-2.5">
                {ncrImages.map((src, idx) => (
                  <div key={idx} className="flex h-32 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-white">
                    <img src={src} alt={`Image ${idx + 1}`} className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
''',
'''              <div className={`grid gap-2.5 ${ncrImages.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                {ncrImages.map((src, idx) => (
                  <div key={idx} className={`flex items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-white ${ncrImages.length === 1 ? "h-60" : "h-36"} ${ncrImages.length === 3 && idx === 2 ? "col-span-2" : ""}`}>
                    <img src={src} alt={`Image ${idx + 1}`} className="h-full w-full object-contain" />
                  </div>
                ))}
              </div>
''')
replace_once(path,
'''  const [customBody, setCustomBody] = useState("");

  const isAr = settings.language === "ar";
''',
'''  const [customBody, setCustomBody] = useState("");
  const [resolvedImages, setResolvedImages] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    if (!open || !item.images?.length) {
      setResolvedImages([]);
      return () => { active = false; };
    }
    void resolveHseImageUrls(item.images).then((urls) => { if (active) setResolvedImages(urls); });
    return () => { active = false; };
  }, [open, item.id, item.refNo, item.images]);

  const renderItem = useMemo(() => resolvedImages.length ? { ...item, images: resolvedImages } : item, [item, resolvedImages]);

  const isAr = settings.language === "ar";
''')
replace_once(path,
'''    const html = buildPrintHtml(item, settings.siteName, isAr, settings);
''',
'''    const html = buildPrintHtml(renderItem, settings.siteName, isAr, settings);
''')
replace_once(path,
'''  }, [item, isAr, settings, customContent]);
''',
'''  }, [renderItem, isAr, settings, customContent]);
''')
replace_once(path,
'''              <PrintView item={item} siteName={settings.siteName} isAr={isAr} settings={settings} />
''',
'''              <PrintView item={renderItem} siteName={settings.siteName} isAr={isAr} settings={settings} />
''')

print("HSE photo attachment patch applied")
