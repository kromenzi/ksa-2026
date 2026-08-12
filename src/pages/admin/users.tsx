import { useState } from "react";

import { useData } from "@/lib/data-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Plus, Search, MoreHorizontal, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";



export default function AdminUsers() {
  const { settings } = useData();
  const isAr = settings.language === "ar";
  
  const { users, addUser, deleteUser, toggleUserStatus } = useData();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'viewer' });
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddUser = () => {
    if (!newUser.name || !newUser.email) {
      toast.error(isAr ? "يرجى ملء جميع الحقول" : "Please fill all fields");
      return;
    }
    addUser({ ...newUser });
    setNewUser({ name: '', email: '', role: 'viewer' });
    setIsDialogOpen(false);
    toast.success(isAr ? "تم إضافة المستخدم بنجاح" : "User added successfully");
  };

  const handleDeleteUser = (id: string) => {
    deleteUser(id);
    toast.success(isAr ? "تم حذف المستخدم" : "User deleted");
  };

  const handleToggleStatus = (id: string) => {
    toggleUserStatus(id);
    toast.success(isAr ? "تم تحديث الحالة" : "Status updated");
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-red-500',
      manager: 'bg-blue-500',
      editor: 'bg-green-500',
      viewer: 'bg-gray-500'
    };
    return <Badge className={colors[role] || 'bg-gray-500'}>{role}</Badge>;
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[24px] font-bold tracking-tight flex items-center gap-2">
            <Users className="h-5 w-5 text-pink-500" />
            {isAr ? "المستخدمين" : "Users"}
          </h2>
          <p className="text-[12px] text-muted-foreground mt-1">
            {isAr ? "إدارة مستخدمي النظام" : "Manage system users"}
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 text-[12px]">
              <Plus className="h-3.5 w-3.5" />
              {isAr ? "مستخدم جديد" : "New User"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isAr ? "إضافة مستخدم جديد" : "Add New User"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>{isAr ? "الاسم" : "Name"}</Label>
                <Input 
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder={isAr ? "اسم المستخدم" : "User name"}
                />
              </div>
              <div className="space-y-2">
                <Label>{isAr ? "البريد الإلكتروني" : "Email"}</Label>
                <Input 
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="user@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>{isAr ? "الدور" : "Role"}</Label>
                <Select value={newUser.role} onValueChange={(v) => setNewUser({ ...newUser, role: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">{isAr ? "مسؤول" : "Admin"}</SelectItem>
                    <SelectItem value="manager">{isAr ? "مدير" : "Manager"}</SelectItem>
                    <SelectItem value="editor">{isAr ? "محرر" : "Editor"}</SelectItem>
                    <SelectItem value="viewer">{isAr ? "مشاهد" : "Viewer"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddUser} className="w-full">
                {isAr ? "إضافة" : "Add User"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="h-3.5 w-3.5 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder={isAr ? "بحث في المستخدمين..." : "Search users..."}
            className="ps-10 text-[12px]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-[14px]">{isAr ? "قائمة المستخدمين" : "Users List"}</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p>{isAr ? "لا يوجد مستخدمين" : "No users found"}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold">
                      {user.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {getRoleBadge(user.role)}
                    <Badge variant={user.isActive ? 'default' : 'secondary'}>
                      {user.isActive ? (isAr ? "نشط" : "Active") : (isAr ? "معطل" : "Inactive")}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleToggleStatus(user.id)}>
                          {user.isActive ? <X className="h-4 w-4 mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                          {user.isActive ? (isAr ? "تعطيل" : "Deactivate") : (isAr ? "تفعيل" : "Activate")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteUser(user.id)} className="text-red-500">
                          <Trash2 className="h-4 w-4 mr-2" />
                          {isAr ? "حذف" : "Delete"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
