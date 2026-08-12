import { readFileSync, writeFileSync } from "node:fs";

const file = "src/pages/admin/ncr/form.tsx";
let source = readFileSync(file, "utf8");

// Normalize legacy NCR records before they enter the edit form. Older records can
// store these values under observation/source metadata, while the edit form
// validates the canonical `department` and `description` fields.
const oldLoad = `          setFormData({
            ...ncr,
            image1: ncr.image1 || null,
            image2: ncr.image2 || null,
            image3: ncr.image3 || null,
            image4: ncr.image4 || null,
            correctiveActions: ncr.correctiveActions || [
              { no: 1, action: "", responsible: "", dueDate: "", effectiveness: "", signature: "" },
              { no: 2, action: "", responsible: "", dueDate: "", effectiveness: "", signature: "" },
            ],
          });`;

const newLoad = `          const sourceFields = ncr.sourceMetadata?.fields || ncr.sourceMetadata?.data?.fields || {};
          const department = ncr.department || ncr.departmentName || sourceFields.department?.value || "";
          const description = ncr.description || ncr.observationDescription || ncr.details || sourceFields.description?.value || "";

          setFormData({
            ...ncr,
            department,
            description,
            date: ncr.date || new Date().toISOString().split("T")[0],
            location: ncr.location || "",
            severity: ncr.severity || "low",
            status: ncr.status || "draft",
            immediateAction: ncr.immediateAction || "",
            rootCause: ncr.rootCause || "",
            correctiveAction: ncr.correctiveAction || "",
            responsiblePersonId: ncr.responsiblePersonId || null,
            dueDate: ncr.dueDate || "",
            verificationNotes: ncr.verificationNotes || "",
            image1: ncr.image1 || null,
            image2: ncr.image2 || null,
            image3: ncr.image3 || null,
            image4: ncr.image4 || null,
            correctiveActions: Array.isArray(ncr.correctiveActions) ? ncr.correctiveActions : [
              { no: 1, action: "", responsible: "", dueDate: "", effectiveness: "", signature: "" },
              { no: 2, action: "", responsible: "", dueDate: "", effectiveness: "", signature: "" },
            ],
          });`;

if (!source.includes(oldLoad)) {
  throw new Error("NCR edit initialization block was not found; refusing to modify an unexpected file.");
}
source = source.replace(oldLoad, newLoad);

// Make validation whitespace-safe and show exactly which required fields are missing.
const oldValidation = `    if (!formData.department || !formData.description) {
      toast({ title: "Validation Error", description: "Department and Description are required.", variant: "destructive" });
      return;
    }`;

const newValidation = `    const department = String(formData.department ?? "").trim();
    const description = String(formData.description ?? "").trim();
    const missingFields = [
      !department ? (isAr ? "القسم" : "Department") : null,
      !description ? (isAr ? "وصف عدم المطابقة" : "Description") : null,
    ].filter(Boolean);

    if (missingFields.length > 0) {
      toast({
        title: isAr ? "بيانات ناقصة" : "Validation Error",
        description: isAr
          ? `يرجى إدخال: ${missingFields.join("، ")}`
          : `Required: ${missingFields.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    const normalizedFormData = { ...formData, department, description };`;

const validationCount = source.split(oldValidation).length - 1;
if (validationCount !== 2) {
  throw new Error(`Expected 2 NCR validation blocks, found ${validationCount}; refusing to modify an unexpected file.`);
}
source = source.replaceAll(oldValidation, newValidation);

// The A4 preview used transform:scale(), which scales the visual box without
// scaling its layout box and can make the preview appear blank/cropped in the
// scroll container. CSS zoom keeps the preview's layout and visual dimensions aligned.
source = source.replace(
  `transform: "scale(0.48)", transformOrigin: "top left",`,
  `zoom: 0.48,`,
);

// Save normalized data on both edit paths.
source = source.replace(
  `await updateNCR(params!.id, formData);`,
  `await updateNCR(params!.id, normalizedFormData);`,
);
source = source.replace(
  `await updateNCR(params!.id, normalizedFormData);\n      setShareNcrMeta({ id: params!.id, refNo: formData.refNo });`,
  `await updateNCR(params!.id, normalizedFormData);\n      setShareNcrMeta({ id: params!.id, refNo: normalizedFormData.refNo });`,
);

writeFileSync(file, source);
console.log("NCR build patch applied successfully.");
