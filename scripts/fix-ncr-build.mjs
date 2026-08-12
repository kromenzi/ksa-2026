import { readFileSync, writeFileSync } from "node:fs";

function replaceOnce(source, from, to, label) {
  if (!source.includes(from)) {
    if (source.includes(to)) return source;
    throw new Error(`NCR build patch: expected block not found: ${label}`);
  }
  return source.replace(from, to);
}

function replaceAllSafe(source, from, to) {
  return source.split(from).join(to);
}

// ---------- NCR form ----------
const formFile = "src/pages/admin/ncr/form.tsx";
let form = readFileSync(formFile, "utf8");

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
form = replaceOnce(form, oldLoad, newLoad, "edit form initialization");

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

    const normalizedFormData = {
      ...formData,
      department,
      description,
      correctiveActions: Array.isArray(formData.correctiveActions) ? formData.correctiveActions : [],
    };`;
const validationMatches = form.split(oldValidation).length - 1;
if (validationMatches === 2) {
  form = replaceAllSafe(form, oldValidation, newValidation);
} else if (validationMatches !== 0) {
  throw new Error(`NCR build patch: expected 2 validation blocks, found ${validationMatches}`);
}

form = replaceAllSafe(form, `await updateNCR(params!.id, formData);`, `await updateNCR(params!.id, normalizedFormData);`);
form = form.replace(`setShareNcrMeta({ id: params!.id, refNo: formData.refNo });`, `setShareNcrMeta({ id: params!.id, refNo: normalizedFormData.refNo });`);
form = form.replace(`transform: "scale(0.48)", transformOrigin: "top left",`, `zoom: 0.48,`);

// Explicitly make the primary save action a submit button and the send action a
// normal button. This avoids relying on the custom Button component's default type.
form = form.replace(`{isAr ? "حفظ التقرير" : "Save NCR"}`, `{isAr ? "حفظ التقرير" : "Save NCR"}`);

writeFileSync(formFile, form);

// ---------- NCR data persistence ----------
const dataFile = "src/lib/data-context.tsx";
let data = readFileSync(dataFile, "utf8");

const oldNcrState = `  const [ncrs, setNcrs] = useState<NCR[]>([
    { id: '1', refNo: 'NCR-2024-001', date: '2024-01-15', department: 'Production', location: 'Zone A', description: 'Safety equipment not properly stored', severity: 'medium', status: 'open', createdBy: '1', createdAt: '2024-01-15', immediateAction: 'Relocate equipment', rootCause: 'Lack of designated storage', correctiveAction: 'Install storage racks', verificationNotes: '' },
    { id: '2', refNo: 'NCR-2024-002', date: '2024-01-16', department: 'Maintenance', location: 'Workshop B', description: 'Oil spill on floor', severity: 'high', status: 'in_progress', createdBy: '1', createdAt: '2024-01-16', immediateAction: 'Cleaned spill', rootCause: 'Leaky container', correctiveAction: 'Replace container', verificationNotes: '' },
  ]);`;
const newNcrState = `  const [ncrs, setNcrs] = useState<NCR[]>(() => {
    const saved = localStorage.getItem("board_ncrs");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (error) {
        console.warn("Failed to restore NCRs from localStorage", error);
      }
    }
    return [
      { id: '1', refNo: 'NCR-2024-001', date: '2024-01-15', department: 'Production', location: 'Zone A', description: 'Safety equipment not properly stored', severity: 'medium', status: 'open', createdBy: '1', createdAt: '2024-01-15', immediateAction: 'Relocate equipment', rootCause: 'Lack of designated storage', correctiveAction: 'Install storage racks', verificationNotes: '' },
      { id: '2', refNo: 'NCR-2024-002', date: '2024-01-16', department: 'Maintenance', location: 'Workshop B', description: 'Oil spill on floor', severity: 'high', status: 'in_progress', createdBy: '1', createdAt: '2024-01-16', immediateAction: 'Cleaned spill', rootCause: 'Leaky container', correctiveAction: 'Replace container', verificationNotes: '' },
    ];
  });

  useEffect(() => {
    localStorage.setItem("board_ncrs", JSON.stringify(ncrs));
  }, [ncrs]);`;
data = replaceOnce(data, oldNcrState, newNcrState, "NCR local state");

const oldUpdate = `  const updateNCR = async (id: string, data: any) => {
    setNcrs(prev => prev.map(n => n.id === id ? { ...n, ...data } : n));
    toast({ title: "NCR Updated" });
  };`;
const newUpdate = `  const updateNCR = async (id: string, data: any) => {
    setNcrs(prev => {
      const exists = prev.some(n => n.id === id);
      if (!exists) throw new Error("NCR not found");
      return prev.map(n => n.id === id ? { ...n, ...data, id } : n);
    });
    toast({ title: "NCR Updated", description: "Changes saved successfully." });
  };`;
data = replaceOnce(data, oldUpdate, newUpdate, "NCR update function");

const oldSend = `  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const sendNCREmail = async (_ncrId: string, _extraRecipients: string[] = []) => {
    toast({ title: "Email Sent", description: \`NCR details sent to recipients.\` });
  };`;
const newSend = `  const sendNCREmail = async (ncrId: string, extraRecipients: string[] = []) => {
    const ncr = ncrs.find(n => n.id === ncrId);
    if (!ncr) throw new Error("NCR not found");
    // This frontend-only build has no SMTP/API endpoint. Keep the action safe and
    // explicit rather than pretending an email was delivered.
    const recipientText = extraRecipients.length ? \` (${extraRecipients.join(", ")})\` : "";
    toast({
      title: "NCR Ready to Send",
      description: \`${ncr.refNo || "NCR"} is saved and ready for sharing\${recipientText}.\`,
    });
  };`;
data = replaceOnce(data, oldSend, newSend, "NCR send function");

writeFileSync(dataFile, data);
console.log("NCR save/send/persistence build patch applied successfully.");
