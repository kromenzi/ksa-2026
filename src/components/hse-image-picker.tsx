import { useEffect, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MAX_HSE_IMAGES, MAX_HSE_IMAGE_BYTES } from "@/lib/hse-image-storage";

interface HseImagePickerProps {
  files: File[];
  onChange: (files: File[]) => void;
  isAr: boolean;
  disabled?: boolean;
  label?: string;
}

export function HseImagePicker({ files, onChange, isAr, disabled = false, label }: HseImagePickerProps) {
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

  const handleSelection = (selected: FileList | null) => {
    if (!selected?.length) return;
    const incoming = Array.from(selected);
    const valid: File[] = [];
    for (const file of incoming) {
      if (!file.type.startsWith("image/")) {
        toast.error(isAr ? `الملف ${file.name} ليس صورة` : `${file.name} is not an image`);
        continue;
      }
      if (file.size > MAX_HSE_IMAGE_BYTES) {
        toast.error(isAr ? `الصورة ${file.name} أكبر من 10MB` : `${file.name} exceeds 10MB`);
        continue;
      }
      valid.push(file);
    }
    const remaining = MAX_HSE_IMAGES - files.length;
    if (valid.length > remaining) {
      toast.error(isAr ? `الحد الأقصى ${MAX_HSE_IMAGES} صور` : `Maximum ${MAX_HSE_IMAGES} images allowed`);
    }
    onChange([...files, ...valid.slice(0, Math.max(0, remaining))]);
  };

  const removeAt = (index: number) => onChange(files.filter((_, i) => i !== index));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor="hse-images" className="flex items-center gap-2">
          <ImagePlus className="h-4 w-4" />
          {label || (isAr ? "صور الإثبات" : "Evidence Photos")}
        </Label>
        <span className="text-xs text-muted-foreground">{files.length}/{MAX_HSE_IMAGES}</span>
      </div>
      <Input
        id="hse-images"
        type="file"
        accept="image/*"
        multiple
        disabled={disabled || files.length >= MAX_HSE_IMAGES}
        onChange={(event) => {
          handleSelection(event.target.files);
          event.currentTarget.value = "";
        }}
      />
      <p className="text-xs text-muted-foreground">
        {isAr ? "يمكن إضافة حتى 4 صور، بحد أقصى 10MB لكل صورة. يتم ترتيب الصور تلقائياً داخل التقرير." : "Add up to 4 images, maximum 10MB each. Images are arranged automatically in the report."}
      </p>
      {previews.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {previews.map((src, index) => (
            <div key={`${files[index]?.name}-${index}`} className="group relative aspect-square overflow-hidden rounded-lg border bg-muted/30">
              <img src={src} alt={isAr ? `صورة ${index + 1}` : `Image ${index + 1}`} className="h-full w-full object-contain" />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute end-1 top-1 h-7 w-7 rounded-full"
                disabled={disabled}
                onClick={() => removeAt(index)}
                title={isAr ? "إزالة الصورة" : "Remove image"}
              >
                <X className="h-4 w-4" />
              </Button>
              <div className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-2 py-1 text-[10px] text-white">{files[index]?.name}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
