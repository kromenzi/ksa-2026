import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLocation } from "wouter";
import { useData } from "@/lib/data-context";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ShieldCheck, Mail as MailIcon, ArrowRight, ArrowLeft, KeyRound, HardHat, Shield, BarChart3, FileText, Moon, Sun, Users, Globe, UserRoundPlus, RefreshCw, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(1, { message: "Password is required" }),
});

const signupSchema = z.object({
  name: z.string().min(2, { message: "Name is required" }),
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(12, { message: "Password must be at least 12 characters" }),
});

const resetSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
});

const changePasswordSchema = z.object({
  password: z.string().min(12, { message: "Password must be at least 12 characters" }),
});

async function readError(res: Response) {
  try {
    const data = await res.json();
    return data?.error || data?.message || "Request failed";
  } catch {
    return res.statusText || "Request failed";
  }
}

async function checkPassword(password: string) {
  const res = await apiRequest("POST", "/api/auth/login?action=password-check", { password });
  const data = await res.json();
  if (!data?.allowed) {
    throw new Error(data?.message || "Password is not allowed");
  }
}

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const { login, logout, isAuthenticated, settings, toggleLanguage, updateSettings } = useData();
  const { toast } = useToast();
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [isSignupLoading, setIsSignupLoading] = useState(false);
  const [isResetLoading, setIsResetLoading] = useState(false);
  const [isChangeLoading, setIsChangeLoading] = useState(false);

  const isAr = settings.language === "ar";
  const Arrow = isAr ? ArrowLeft : ArrowRight;

  const loginForm = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });
  const signupForm = useForm<z.infer<typeof signupSchema>>({ resolver: zodResolver(signupSchema), defaultValues: { name: "", email: "", password: "" } });
  const resetForm = useForm<z.infer<typeof resetSchema>>({ resolver: zodResolver(resetSchema), defaultValues: { email: "" } });
  const changePasswordForm = useForm<z.infer<typeof changePasswordSchema>>({ resolver: zodResolver(changePasswordSchema), defaultValues: { password: "" } });

  useEffect(() => {
    if (isAuthenticated) setLocation("/admin/dashboard");
  }, [isAuthenticated, setLocation]);

  const statusText = useMemo(() => {
    return isAr ? "نظام محمي — الدخول للمصرح لهم فقط" : "Protected System — Authorized Access Only";
  }, [isAr]);

  if (isAuthenticated) return null;

  async function onLogin(values: z.infer<typeof loginSchema>) {
    setIsLoginLoading(true);
    try {
      await login(values.email, values.password);
      toast({ title: isAr ? "تم تسجيل الدخول" : "Signed in" });
    } catch (error: any) {
      toast({ title: isAr ? "خطأ في تسجيل الدخول" : "Login failed", description: error?.message || (isAr ? "تحقق من البيانات" : "Check your credentials"), variant: "destructive" });
    } finally {
      setIsLoginLoading(false);
    }
  }

  async function onSignup(values: z.infer<typeof signupSchema>) {
    setIsSignupLoading(true);
    try {
      await checkPassword(values.password);
      const res = await fetch("/api/auth/login?action=signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error(await readError(res));
      toast({ title: isAr ? "تم إنشاء الحساب" : "Account created", description: isAr ? "تحقق من البريد إن لزم" : "Check your email if confirmation is enabled" });
      signupForm.reset();
    } catch (error: any) {
      toast({ title: isAr ? "فشل إنشاء الحساب" : "Signup failed", description: error?.message || (isAr ? "تعذر إكمال العملية" : "Unable to complete the request"), variant: "destructive" });
    } finally {
      setIsSignupLoading(false);
    }
  }

  async function onReset(values: z.infer<typeof resetSchema>) {
    setIsResetLoading(true);
    try {
      const res = await fetch("/api/auth/login?action=reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error(await readError(res));
      toast({ title: isAr ? "تم الإرسال" : "Reset email sent", description: isAr ? "تحقق من بريدك لإكمال الاستعادة" : "Check your inbox to continue" });
      resetForm.reset();
    } catch (error: any) {
      toast({ title: isAr ? "فشل الإرسال" : "Reset failed", description: error?.message || (isAr ? "حاول مرة أخرى" : "Please try again"), variant: "destructive" });
    } finally {
      setIsResetLoading(false);
    }
  }

  async function onChangePassword(values: z.infer<typeof changePasswordSchema>) {
    setIsChangeLoading(true);
    try {
      await checkPassword(values.password);
      const res = await fetch("/api/auth/login?action=change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error(await readError(res));
      toast({ title: isAr ? "تم تحديث كلمة المرور" : "Password updated" });
      changePasswordForm.reset();
    } catch (error: any) {
      toast({ title: isAr ? "فشل تحديث كلمة المرور" : "Update failed", description: error?.message || (isAr ? "تعذر حفظ كلمة المرور" : "Unable to save the new password"), variant: "destructive" });
    } finally {
      setIsChangeLoading(false);
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: isAr ? "تم النسخ" : "Copied", description: isAr ? "تم نسخ البريد" : "Email copied" });
    loginForm.setValue("email", text);
    loginForm.setValue("password", "password123");
  };

  const toggleTheme = () => void updateSettings({ theme: settings.theme === "light" ? "dark" : "light" });

  const accounts = [
    { label: "Super Admin", labelAr: "المسؤول الأعلى", email: "admin@board.com", desc: "Full Access", descAr: "صلاحيات كاملة", color: "from-slate-600 to-cyan-700", icon: ShieldCheck },
    { label: "Safety Manager", labelAr: "مدير السلامة", email: "safety@board.com", desc: "Management", descAr: "إدارة", color: "from-teal-600 to-emerald-700", icon: KeyRound },
    { label: "Site Engineer", labelAr: "مهندس الموقع", email: "eng@board.com", desc: "Editor", descAr: "تحرير", color: "from-stone-600 to-slate-700", icon: Users },
  ];

  const features = [
    { icon: Shield, labelEn: "Safety Reports", labelAr: "تقارير السلامة", color: "text-emerald-500" },
    { icon: FileText, labelEn: "NCR Management", labelAr: "إدارة عدم المطابقة", color: "text-cyan-500" },
    { icon: BarChart3, labelEn: "Analytics & KPIs", labelAr: "التحليلات ومؤشرات الأداء", color: "text-slate-300" },
    { icon: HardHat, labelEn: "Plant Management", labelAr: "إدارة المصانع", color: "text-stone-300" },
  ];

  return (
    <div className="min-h-screen flex bg-background" dir={isAr ? "rtl" : "ltr"}>
      <div className="hidden lg:flex lg:w-[45%] xl:w-[40%] relative overflow-hidden" style={{ background: "linear-gradient(180deg, hsl(210 14% 7%) 0%, hsl(210 12% 10%) 55%, hsl(198 18% 11%) 100%)" }}>
        <div className="absolute inset-0 hazard-stripe opacity-40" />
        <div className="absolute inset-x-0 top-0 h-0.5 bg-primary" />
        <div className="relative z-10 flex flex-col justify-between p-8 xl:p-12 w-full">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-xl overflow-hidden bg-white/10 p-0.5 shadow-lg shadow-primary/30 ring-1 ring-white/20 shrink-0">
              <img src={settings.branding?.companyLogo || "/utec-logo.svg"} alt="Logo" className="h-full w-full brand-logo-mark rounded-lg" referrerPolicy="no-referrer" onError={(e) => { if (e.currentTarget.src !== window.location.origin + "/utec-logo.svg") e.currentTarget.src = "/utec-logo.svg"; }} />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg tracking-tight">{settings.siteName || "UTEC SAFETY BOARD"}</h2>
              <p className="text-cyan-200/60 text-xs uppercase tracking-widest font-medium">{isAr ? "منصة إدارة السلامة الصناعية" : "Industrial Safety Management"}</p>
            </div>
          </div>
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl xl:text-4xl font-bold text-white leading-tight mb-3 whitespace-pre-line">{isAr ? "منصة السلامة\nالصناعية المتكاملة" : "Integrated Industrial\nSafety Platform"}</h1>
              <p className="text-slate-300/55 text-sm leading-relaxed max-w-md">{isAr ? "منصة مركزية لإدارة ملاحظات السلامة وتقارير عدم المطابقة ومتابعة الامتثال وإجراءات السلامة الاستباقية" : "Centralized platform for managing safety observations, non-conformance reports, compliance tracking, and proactive safety measures"}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">{features.map((feature, index) => (<div key={index} className="flex items-center gap-2.5 p-3 rounded-sm bg-white/[0.04] border border-white/[0.08] border-t-primary/50 border-t-2"><feature.icon className={`h-4 w-4 ${feature.color} shrink-0`} /><span className="text-white/70 text-xs font-medium">{isAr ? feature.labelAr : feature.labelEn}</span></div>))}</div>
          </div>
          <div className="flex items-center gap-2 text-white/25 text-[11px]"><ShieldCheck className="h-3 w-3" /><span>© {new Date().getFullYear()} UTEC SAFETY BOARD — {isAr ? "الصحة والسلامة والبيئة" : "Health, Safety & Environment"}</span></div>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-background">
        <div className="flex items-center justify-between p-4 sm:p-6">
          <div className="flex items-center gap-2 lg:hidden">
            <img src={settings.branding?.companyLogo || "/utec-logo.svg"} alt="Logo" className="h-10 w-[60px] brand-logo-full" onError={(e) => { if (e.currentTarget.src !== window.location.origin + "/utec-logo.svg") e.currentTarget.src = "/utec-logo.svg"; }} />
            <span className="font-bold text-sm">{settings.siteName || "UTEC SAFETY BOARD"}</span>
          </div>
          <div className="lg:ms-auto" />
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8 rounded-lg hover:bg-muted/60" data-testid="button-toggle-theme">{settings.theme === "dark" ? <Sun className="h-3.5 w-3.5 text-amber-400" /> : <Moon className="h-3.5 w-3.5 text-muted-foreground" />}</Button>
            <Button variant="ghost" size="sm" onClick={toggleLanguage} className="h-8 rounded-lg hover:bg-muted/60 gap-1.5 px-3 text-xs font-medium" data-testid="button-toggle-language"><Globe className="h-3.5 w-3.5" />{isAr ? "English" : "العربية"}</Button>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-md space-y-5">
            <div className="text-center space-y-2">
              <img src={settings.branding?.companyLogo || "/utec-logo.svg"} alt={settings.siteName || "Logo"} className="w-[min(74vw,380px)] max-h-[255px] brand-logo-full mx-auto mb-4 drop-shadow-xl transition-all duration-300 hover:scale-105" onError={(e) => { if (e.currentTarget.src !== window.location.origin + "/utec-logo.svg") e.currentTarget.src = "/utec-logo.svg"; }} />
              <h1 className="text-2xl font-bold tracking-tight">{isAr ? "التحكم بالحساب" : "Account Access"}</h1>
              <p className="text-sm text-muted-foreground">{isAr ? "سجّل الدخول أو أنشئ حسابًا أو اطلب استعادة كلمة المرور" : "Sign in, create an account, or request a reset"}</p>
            </div>

            <Card className="shadow-xl shadow-black/8 border-border/50 border-t-2 border-t-primary bg-card/90 rounded-sm">
              <CardContent className="p-6">
                <Tabs defaultValue="login" className="w-full">
                  <TabsList className="grid w-full grid-cols-4 mb-4">
                    <TabsTrigger value="login">{isAr ? "دخول" : "Login"}</TabsTrigger>
                    <TabsTrigger value="signup">{isAr ? "حساب" : "Signup"}</TabsTrigger>
                    <TabsTrigger value="reset">{isAr ? "استعادة" : "Reset"}</TabsTrigger>
                    <TabsTrigger value="change">{isAr ? "تغيير" : "Change"}</TabsTrigger>
                  </TabsList>

                  <TabsContent value="login">
                    <Form {...loginForm}>
                      <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                        <FormField control={loginForm.control} name="email" render={({ field }: any) => (<FormItem><FormLabel className="text-xs font-semibold text-muted-foreground">{isAr ? "البريد الإلكتروني" : "Email"}</FormLabel><FormControl><div className="relative"><MailIcon className="h-4 w-4 absolute start-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/40" /><Input placeholder={isAr ? "name@example.com" : "admin@example.com"} className="ps-10 h-11 rounded-xl bg-muted/30 dark:bg-white/5 border-border/50 focus:border-primary/50 text-sm" dir="ltr" {...field} /></div></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={loginForm.control} name="password" render={({ field }: any) => (<FormItem><FormLabel className="text-xs font-semibold text-muted-foreground">{isAr ? "كلمة المرور" : "Password"}</FormLabel><FormControl><div className="relative"><KeyRound className="h-4 w-4 absolute start-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/40" /><Input type="password" placeholder="••••••••" className="ps-10 h-11 rounded-xl bg-muted/30 dark:bg-white/5 border-border/50 focus:border-primary/50 text-sm" dir="ltr" {...field} /></div></FormControl><FormMessage /></FormItem>)} />
                        <Button type="submit" disabled={isLoginLoading} className="w-full h-11 text-sm font-semibold rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all duration-300" data-testid="button-login-submit">{isLoginLoading ? <span className="flex items-center gap-2"><span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{isAr ? "جاري الدخول..." : "Signing in..."}</span> : <>{isAr ? "دخول" : "Sign In"}<Arrow className="h-4 w-4 ms-2" /></>}</Button>
                      </form>
                    </Form>
                  </TabsContent>

                  <TabsContent value="signup">
                    <Form {...signupForm}><form onSubmit={signupForm.handleSubmit(onSignup)} className="space-y-4"><FormField control={signupForm.control} name="name" render={({ field }: any) => (<FormItem><FormLabel className="text-xs font-semibold text-muted-foreground">{isAr ? "الاسم" : "Name"}</FormLabel><FormControl><Input placeholder={isAr ? "اسمك" : "Your name"} className="h-11 rounded-xl bg-muted/30 dark:bg-white/5 border-border/50 focus:border-primary/50 text-sm" {...field} /></FormControl><FormMessage /></FormItem>)} /><FormField control={signupForm.control} name="email" render={({ field }: any) => (<FormItem><FormLabel className="text-xs font-semibold text-muted-foreground">{isAr ? "البريد الإلكتروني" : "Email"}</FormLabel><FormControl><Input placeholder={isAr ? "name@example.com" : "name@example.com"} className="h-11 rounded-xl bg-muted/30 dark:bg-white/5 border-border/50 focus:border-primary/50 text-sm" dir="ltr" {...field} /></FormControl><FormMessage /></FormItem>)} /><FormField control={signupForm.control} name="password" render={({ field }: any) => (<FormItem><FormLabel className="text-xs font-semibold text-muted-foreground">{isAr ? "كلمة المرور" : "Password"}</FormLabel><FormControl><Input type="password" placeholder="At least 12 characters" className="h-11 rounded-xl bg-muted/30 dark:bg-white/5 border-border/50 focus:border-primary/50 text-sm" dir="ltr" {...field} /></FormControl><FormMessage /></FormItem>)} /><Button type="submit" disabled={isSignupLoading} className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90">{isSignupLoading ? <span className="flex items-center gap-2"><span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{isAr ? "جاري الإنشاء..." : "Creating..."}</span> : <><UserRoundPlus className="h-4 w-4 me-2" />{isAr ? "إنشاء حساب" : "Create Account"}</>}</Button></form></Form>
                  </TabsContent>

                  <TabsContent value="reset">
                    <Form {...resetForm}><form onSubmit={resetForm.handleSubmit(onReset)} className="space-y-4"><FormField control={resetForm.control} name="email" render={({ field }: any) => (<FormItem><FormLabel className="text-xs font-semibold text-muted-foreground">{isAr ? "البريد الإلكتروني" : "Email"}</FormLabel><FormControl><Input placeholder={isAr ? "name@example.com" : "name@example.com"} className="h-11 rounded-xl bg-muted/30 dark:bg-white/5 border-border/50 focus:border-primary/50 text-sm" dir="ltr" {...field} /></FormControl><FormMessage /></FormItem>)} /><Button type="submit" disabled={isResetLoading} className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90">{isResetLoading ? <span className="flex items-center gap-2"><span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{isAr ? "جاري الإرسال..." : "Sending..."}</span> : <><RefreshCw className="h-4 w-4 me-2" />{isAr ? "إرسال رابط الاستعادة" : "Send reset link"}</>}</Button></form></Form>
                  </TabsContent>

                  <TabsContent value="change">
                    <Form {...changePasswordForm}><form onSubmit={changePasswordForm.handleSubmit(onChangePassword)} className="space-y-4"><FormField control={changePasswordForm.control} name="password" render={({ field }: any) => (<FormItem><FormLabel className="text-xs font-semibold text-muted-foreground">{isAr ? "كلمة المرور الجديدة" : "New password"}</FormLabel><FormControl><div className="relative"><Lock className="h-4 w-4 absolute start-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/40" /><Input type="password" placeholder="At least 12 characters" className="ps-10 h-11 rounded-xl bg-muted/30 dark:bg-white/5 border-border/50 focus:border-primary/50 text-sm" dir="ltr" {...field} /></div></FormControl><FormMessage /></FormItem>)} /><Button type="submit" disabled={isChangeLoading} className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90">{isChangeLoading ? <span className="flex items-center gap-2"><span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{isAr ? "جاري التحديث..." : "Updating..."}</span> : <><Lock className="h-4 w-4 me-2" />{isAr ? "تغيير كلمة المرور" : "Change password"}</>}</Button></form></Form>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <div className="space-y-2.5">
              <p className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-wider text-center">{isAr ? "حسابات تجريبية" : "Demo Accounts"}</p>
              <div className="grid grid-cols-3 gap-2">{accounts.map((acc, i) => (<button key={i} type="button" onClick={() => copyToClipboard(acc.email)} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-card/60 dark:bg-card/60 border border-border/30 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 group" data-testid={`button-demo-account-${i}`}><div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${acc.color} flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow`}><acc.icon className="h-4 w-4 text-white" /></div><div className="text-center"><p className="text-[11px] font-semibold leading-tight">{isAr ? acc.labelAr : acc.label}</p><p className="text-[9px] text-muted-foreground/50 mt-0.5">{isAr ? acc.descAr : acc.desc}</p></div></button>))}</div>
            </div>

            <p className="text-[11px] text-muted-foreground/40 text-center flex items-center justify-center gap-1.5"><ShieldCheck className="h-3 w-3" />{statusText}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
