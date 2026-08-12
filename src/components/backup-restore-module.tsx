import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Download, Upload, HardDrive, Trash2, CheckCircle2, AlertCircle, RefreshCw, Archive, Database } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { BackupService, generateFullBackup, restoreFromBackup, type BackupMetadata } from '@/lib/backup-service';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

export function BackupRestoreModule({ isAr, currentUser }: { isAr: boolean, currentUser: any }) {
  const { toast } = useToast();
  const [backups, setBackups] = useState<BackupMetadata[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStep, setProgressStep] = useState('');
  
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadBackups();
  }, []);

  async function loadBackups() {
    try {
      const list = await BackupService.getBackups();
      setBackups(list);
    } catch (err) { console.debug(err);
      console.error(err);
    }
  };

  const handleCreateBackup = async () => {
    if (isCreating) return;
    setIsCreating(true);
    setProgress(0);
    try {
      const record = await generateFullBackup((step, prog) => {
        setProgressStep(step);
        setProgress(prog);
      }, currentUser?.name || 'System Admin');
      
      await BackupService.saveBackup(record);
      
      toast({
        title: isAr ? 'تم إنشاء النسخة الاحتياطية' : 'Backup Created',
        description: isAr ? 'تم حفظ النسخة الاحتياطية بنجاح.' : 'Full system backup has been created successfully.',
      });
      await loadBackups();
    } catch (err) { console.debug(err);
      toast({
        title: isAr ? 'حدث خطأ' : 'Error',
        description: isAr ? 'فشل إنشاء النسخة الاحتياطية.' : 'Failed to create backup.',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
      setProgress(0);
      setProgressStep('');
    }
  };

  const handleDownloadBackup = async (id: string, date: string) => {
    try {
      const blob = await BackupService.getBackupBlob(id);
      if (!blob) throw new Error('Backup not found');
      
      const safeDate = new Date(date).toISOString().replace(/[:.]/g, '-');
      const filename = `SafetyBoard_Backup_${safeDate}.zip`;
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.parentNode?.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) { console.debug(err);
      toast({
        title: isAr ? 'حدث خطأ' : 'Error',
        description: isAr ? 'فشل تحميل النسخة الاحتياطية.' : 'Failed to download backup.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteBackup = async (id: string) => {
    if (!confirm(isAr ? 'هل أنت متأكد من حذف هذه النسخة؟' : 'Are you sure you want to delete this backup?')) return;
    try {
      await BackupService.deleteBackup(id);
      await loadBackups();
      toast({
        title: isAr ? 'تم الحذف' : 'Deleted',
        description: isAr ? 'تم حذف النسخة الاحتياطية بنجاح.' : 'Backup deleted successfully.',
      });
    } catch (err) { console.debug(err);
      toast({
        title: isAr ? 'حدث خطأ' : 'Error',
        description: isAr ? 'فشل حذف النسخة الاحتياطية.' : 'Failed to delete backup.',
        variant: 'destructive',
      });
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setRestoreFile(file);
      setRestoreConfirmOpen(true);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRestore = async () => {
    if (!restoreFile) return;
    setRestoreConfirmOpen(false);
    setIsRestoring(true);
    setProgress(0);
    
    try {
      await restoreFromBackup(restoreFile, (step, prog) => {
        setProgressStep(step);
        setProgress(prog);
      });
      toast({
        title: isAr ? 'تم الاستعادة' : 'Restored',
        description: isAr ? 'تم استعادة النظام بنجاح. سيتم إعادة التحميل...' : 'System restored successfully. Reloading...',
      });
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) { console.debug(err);
      toast({
        title: isAr ? 'خطأ في الاستعادة' : 'Restore Error',
        description: isAr ? 'ملف غير صالح أو حدث خطأ أثناء الاستعادة.' : 'Invalid backup file or error during restore.',
        variant: 'destructive',
      });
      setIsRestoring(false);
      setProgressStep('');
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Create Backup */}
        <Card className="rounded-2xl border-border/60 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-base">{isAr ? 'إنشاء نسخة احتياطية كاملة' : 'Create Full Backup'}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {isAr ? 'يقوم هذا الخيار بإنشاء حزمة ZIP مضغوطة تحتوي على جميع قواعد البيانات، المرفقات، المستندات، والصور مع إعدادات النظام الحالية.' : 'This creates a full ZIP package containing database records, attachments, settings, and documents.'}
            </p>
            
            {(isCreating || isRestoring) ? (
              <div className="space-y-2 pt-4">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>{progressStep}</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            ) : (
              <Button onClick={handleCreateBackup} disabled={isCreating || isRestoring} className="w-full h-10 rounded-xl gap-2">
                <Database className="h-4 w-4" />
                {isAr ? 'بدء النسخ الاحتياطي' : 'Start Backup Process'}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Restore Backup */}
        <Card className="rounded-2xl border-border/60 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-emerald-500" />
              <CardTitle className="text-base">{isAr ? 'استعادة النظام' : 'Restore System'}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {isAr ? 'استعادة النظام بالكامل من ملف نسخة احتياطية سابق (ZIP). سيتم استبدال البيانات الحالية بالكامل.' : 'Restore the system from a previous backup ZIP file. Current data will be replaced entirely.'}
            </p>
            <input 
              type="file" 
              accept=".zip" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={onFileChange}
            />
            <Button 
              onClick={() => fileInputRef.current?.click()} 
              disabled={isCreating || isRestoring} 
              variant="outline" 
              className="w-full h-10 rounded-xl gap-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
            >
              <Upload className="h-4 w-4" />
              {isAr ? 'رفع ملف والاستعادة' : 'Upload & Restore'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Backup History */}
      <Card className="rounded-2xl border-border/60 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-gray-500" />
            <CardTitle className="text-base">{isAr ? 'سجل النسخ الاحتياطي' : 'Backup History'}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {backups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <Archive className="h-10 w-10 mx-auto mb-3 opacity-20" />
              {isAr ? 'لا توجد نسخ احتياطية حتى الآن' : 'No backups available'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className={`pb-3 font-medium text-muted-foreground ${isAr ? 'text-right' : 'text-left'}`}>{isAr ? 'التاريخ' : 'Date'}</th>
                    <th className={`pb-3 font-medium text-muted-foreground ${isAr ? 'text-right' : 'text-left'}`}>{isAr ? 'الحجم' : 'Size'}</th>
                    <th className={`pb-3 font-medium text-muted-foreground ${isAr ? 'text-right' : 'text-left'}`}>{isAr ? 'السجلات' : 'Records'}</th>
                    <th className={`pb-3 font-medium text-muted-foreground ${isAr ? 'text-right' : 'text-left'}`}>{isAr ? 'الحالة' : 'Status'}</th>
                    <th className={`pb-3 font-medium text-muted-foreground text-center`}>{isAr ? 'إجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {backups.map(bk => (
                    <tr key={bk.id} className="hover:bg-slate-50/50">
                      <td className="py-3">
                        <div className="font-medium text-slate-800">{new Date(bk.date).toLocaleDateString(isAr ? 'ar-SA' : 'en-US')}</div>
                        <div className="text-xs text-muted-foreground">{new Date(bk.date).toLocaleTimeString(isAr ? 'ar-SA' : 'en-US')}</div>
                      </td>
                      <td className="py-3">{formatSize(bk.size)}</td>
                      <td className="py-3">{bk.records}</td>
                      <td className="py-3">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                          <CheckCircle2 className="h-3 w-3" />
                          {bk.status}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center justify-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleDownloadBackup(bk.id, bk.date)} className="h-8 px-2 rounded-lg text-blue-600 hover:text-blue-700">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleDeleteBackup(bk.id)} className="h-8 px-2 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={restoreConfirmOpen} onOpenChange={setRestoreConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              {isAr ? 'تحذير الاستعادة' : 'Restore Warning'}
            </DialogTitle>
            <DialogDescription className="pt-3">
              {isAr ? 
                'أنت على وشك استعادة النظام من نسخة احتياطية. سيتم استبدال جميع البيانات الحالية بشكل نهائي ولا يمكن التراجع عن هذه العملية.' : 
                'You are about to restore the system from a backup. All current data will be permanently replaced and this action cannot be undone.'}
            </DialogDescription>
          </DialogHeader>
          <div className="bg-slate-50 p-4 rounded-lg text-sm my-2 border border-slate-100">
            <strong>{isAr ? 'الملف:' : 'File:'}</strong> {restoreFile?.name} <br/>
            <strong>{isAr ? 'الحجم:' : 'Size:'}</strong> {restoreFile ? formatSize(restoreFile.size) : ''}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setRestoreConfirmOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button variant="destructive" onClick={handleRestore}>
              {isAr ? 'تأكيد الاستعادة' : 'Confirm Restore'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
