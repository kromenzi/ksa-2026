import { readFileSync, writeFileSync } from "node:fs";

const file = "src/pages/admin/ncr/form.tsx";
let source = readFileSync(file, "utf8");

// Keep the build patch idempotent for repeated local builds.
if (source.includes("const sourceFields = ncr.sourceMetadata?.fields")) {
  console.log("NCR build patch already applied; skipping.");
  process.exit(0);
}

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

source = source.replace(
  `transform: "scale(0.48)", transformOrigin: "top left",`,
  `zoom: 0.48,`,
);

source = source.replaceAll(
  `await updateNCR(params!.id, formData);`,
  `await updateNCR(params!.id, normalizedFormData);`,
);

writeFileSync(file, source);
console.log("NCR build patch applied successfully.");
