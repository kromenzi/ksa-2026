"use client";

import { useState } from "react";
import { useData } from "@/lib/data-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Plus, Search, Edit, Trash2, Calendar, User, Tag, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Post {
  id: string;
  title: string;
  content: string;
  author: string;
  section: string;
  status: "published" | "draft" | "archived";
  createdAt: string;
  tags: string[];
}

export default function AdminPosts() {
  const { settings, sections, hasPermission, currentUser } = useData();
  const isAr = settings.language === "ar";
  const canEdit = hasPermission("content", "create");
  const canDelete = hasPermission("content", "delete");

  const [posts, setPosts] = useState<Post[]>([
    { id: "1", title: "Safety Guidelines Update", content: "Updated safety guidelines for all operations...", author: "Admin", section: "Safety", status: "published", createdAt: "2024-01-15", tags: ["safety", "guidelines"] },
    { id: "2", title: "Monthly HSE Report", content: "HSE performance report for January 2024...", author: "HSE Manager", section: "Reports", status: "published", createdAt: "2024-01-20", tags: ["hse", "monthly"] },
    { id: "3", title: "New Equipment Training", content: "Training schedule for new safety equipment...", author: "Training Team", section: "Training", status: "draft", createdAt: "2024-02-01", tags: ["training", "equipment"] },
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [formData, setFormData] = useState<Partial<Post>>({
    status: "draft",
    tags: [],
  });
  const [tagInput, setTagInput] = useState("");

  const filteredPosts = posts.filter(p =>
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAdd = () => {
    setEditingPost(null);
    setFormData({ status: "draft", tags: [] });
    setTagInput("");
    setShowDialog(true);
  };

  const handleEdit = (post: Post) => {
    setEditingPost(post);
    setFormData(post);
    setTagInput("");
    setShowDialog(true);
  };

  const handleDelete = (id: string) => {
    setPosts(posts.filter(p => p.id !== id));
    toast.success(isAr ? "تم حذف المنشور" : "Post deleted");
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...(formData.tags || []), tagInput.trim()] });
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags?.filter(t => t !== tag) || [] });
  };

  const handleSave = () => {
    if (!formData.title || !formData.content) {
      toast.error(isAr ? "العنوان والمحتوى مطلوبان" : "Title and content are required");
      return;
    }

    if (editingPost) {
      setPosts(posts.map(p => p.id === editingPost.id ? { ...p, ...formData } as Post : p));
      toast.success(isAr ? "تم تحديث المنشور" : "Post updated");
    } else {
      const newPost: Post = {
        id: Date.now().toString(),
        title: formData.title || "",
        content: formData.content || "",
        author: currentUser?.name || "Admin",
        section: formData.section || "",
        status: formData.status as "published" | "draft" | "archived" || "draft",
        createdAt: new Date().toISOString().split("T")[0],
        tags: formData.tags || [],
      };
      setPosts([...posts, newPost]);
      toast.success(isAr ? "تم إضافة المنشور" : "Post added");
    }
    setShowDialog(false);
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      published: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      draft: "bg-slate-500/10 text-slate-600 border-slate-500/20",
      archived: "bg-gray-500/10 text-gray-600 border-gray-500/20",
    };
    const labels = {
      published: isAr ? "منشور" : "Published",
      draft: isAr ? "مسودة" : "Draft",
      archived: isAr ? "مؤرشف" : "Archived",
    };
    return (
      <Badge variant="outline" className={styles[status as keyof typeof styles]}>
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6 text-sky-500" />
            {isAr ? "المنشورات" : "Posts"}
          </h2>
          <p className="text-muted-foreground mt-1">
            {isAr ? "إدارة المحتوى والمنشورات" : "Manage content and posts"}
          </p>
        </div>
        {canEdit && (
          <Button className="gap-2" onClick={handleAdd}>
            <Plus className="h-4 w-4" />
            {isAr ? "منشور جديد" : "New Post"}
          </Button>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="h-4 w-4 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={isAr ? "بحث في المنشورات..." : "Search posts..."}
            className="ps-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isAr ? "قائمة المنشورات" : "Posts List"}</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredPosts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p>{isAr ? "لا توجد منشورات حالياً" : "No posts yet"}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPosts.map((post) => (
                <div key={post.id} className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-lg bg-sky-500/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-sky-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(post.status)}
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {post.createdAt}
                        </span>
                      </div>
                      <p className="font-medium mt-1">{post.title}</p>
                      <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{post.content}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          {post.author}
                        </span>
                        {post.section && (
                          <Badge variant="secondary" className="text-xs">
                            {post.section}
                          </Badge>
                        )}
                        {post.tags.map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs flex items-center gap-1">
                            <Tag className="h-3 w-3" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {(canEdit || canDelete) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canEdit && (
                            <DropdownMenuItem onClick={() => handleEdit(post)}>
                              <Edit className="h-4 w-4 mr-2" />
                              {isAr ? "تعديل" : "Edit"}
                            </DropdownMenuItem>
                          )}
                          {canDelete && (
                            <DropdownMenuItem onClick={() => handleDelete(post.id)} className="text-red-500">
                              <Trash2 className="h-4 w-4 mr-2" />
                              {isAr ? "حذف" : "Delete"}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingPost
                ? (isAr ? "تعديل المنشور" : "Edit Post")
                : (isAr ? "منشور جديد" : "New Post")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{isAr ? "العنوان" : "Title"}</Label>
              <Input
                value={formData.title || ""}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder={isAr ? "عنوان المنشور" : "Post title"}
              />
            </div>
            <div className="space-y-2">
              <Label>{isAr ? "المحتوى" : "Content"}</Label>
              <Textarea
                value={formData.content || ""}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder={isAr ? "محتوى المنشور" : "Post content"}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>{isAr ? "القسم" : "Section"}</Label>
              <Select
                value={formData.section}
                onValueChange={(v) => setFormData({ ...formData, section: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isAr ? "اختر القسم" : "Select section"} />
                </SelectTrigger>
                <SelectContent>
                  {sections.map((section) => (
                    <SelectItem key={section.id} value={section.name}>{section.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{isAr ? "الحالة" : "Status"}</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => setFormData({ ...formData, status: v as "published" | "draft" | "archived" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="published">{isAr ? "منشور" : "Published"}</SelectItem>
                  <SelectItem value="draft">{isAr ? "مسودة" : "Draft"}</SelectItem>
                  <SelectItem value="archived">{isAr ? "مؤرشف" : "Archived"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{isAr ? "الوسوم" : "Tags"}</Label>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder={isAr ? "أضف وسم" : "Add tag"}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
                />
                <Button type="button" variant="outline" onClick={handleAddTag}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.tags?.map(tag => (
                  <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => handleRemoveTag(tag)}>
                    {tag} ×
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              {isAr ? "إلغاء" : "Cancel"}
            </Button>
            <Button onClick={handleSave}>
              {editingPost
                ? (isAr ? "تحديث" : "Update")
                : (isAr ? "إضافة" : "Add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
