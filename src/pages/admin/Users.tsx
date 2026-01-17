import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Shield, ShieldCheck, User, Loader2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { MobileUserCard } from "@/components/admin/MobileUserCard";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserWithRole {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  user_type: string;
  role: AppRole | null;
}

export default function Users() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    userId: string;
    userName: string;
    newRole: AppRole | "remove";
    currentRole: AppRole | null;
  } | null>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id,
          user_id,
          name,
          email,
          user_type
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch roles separately
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      const rolesMap = new Map(roles?.map((r) => [r.user_id, r.role]));

      return data.map((profile) => ({
        ...profile,
        role: rolesMap.get(profile.user_id) || null,
      })) as UserWithRole[];
    },
  });

  const assignRoleMutation = useMutation({
    mutationFn: async ({
      userId,
      role,
    }: {
      userId: string;
      role: AppRole;
    }) => {
      // First check if user already has a role
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existingRole) {
        // Update existing role
        const { error } = await supabase
          .from("user_roles")
          .update({ role })
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({
        title: "Role atualizada",
        description: "A permissão do usuário foi atualizada com sucesso.",
      });
      setConfirmDialog(null);
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar role",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeRoleMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({
        title: "Role removida",
        description: "A permissão do usuário foi removida.",
      });
      setConfirmDialog(null);
    },
    onError: (error) => {
      toast({
        title: "Erro ao remover role",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleRoleChange = (
    userProfile: UserWithRole,
    newRole: string
  ) => {
    // Prevent admin from removing their own admin role
    if (userProfile.user_id === user?.id && newRole !== "admin") {
      toast({
        title: "Ação não permitida",
        description: "Você não pode remover sua própria permissão de admin.",
        variant: "destructive",
      });
      return;
    }

    if (newRole === "remove") {
      setConfirmDialog({
        open: true,
        userId: userProfile.user_id,
        userName: userProfile.name,
        newRole: "remove",
        currentRole: userProfile.role,
      });
    } else {
      setConfirmDialog({
        open: true,
        userId: userProfile.user_id,
        userName: userProfile.name,
        newRole: newRole as AppRole,
        currentRole: userProfile.role,
      });
    }
  };

  const confirmRoleChange = () => {
    if (!confirmDialog) return;

    if (confirmDialog.newRole === "remove") {
      removeRoleMutation.mutate(confirmDialog.userId);
    } else {
      assignRoleMutation.mutate({
        userId: confirmDialog.userId,
        role: confirmDialog.newRole,
      });
    }
  };

  const filteredUsers = users?.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const getRoleBadge = (role: AppRole | null) => {
    switch (role) {
      case "admin":
        return (
          <Badge className="bg-primary/20 text-primary border-primary/30">
            <ShieldCheck className="w-3 h-3 mr-1" />
            Admin
          </Badge>
        );
      case "user":
        return (
          <Badge variant="secondary">
            <User className="w-3 h-3 mr-1" />
            User
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground">
            Sem role
          </Badge>
        );
    }
  };

  const isPending = assignRoleMutation.isPending || removeRoleMutation.isPending;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gradient-gold">
          Gerenciamento de Usuários
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Gerencie permissões e acessos do sistema
        </p>
      </div>

      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-secondary"
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : filteredUsers?.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Nenhum usuário encontrado</p>
        </div>
      ) : isMobile ? (
        <div className="space-y-3">
          {filteredUsers?.map((userProfile) => (
            <MobileUserCard
              key={userProfile.id}
              userProfile={userProfile}
              isCurrentUser={userProfile.user_id === user?.id}
              isPending={isPending}
              onRoleChange={handleRoleChange}
            />
          ))}
        </div>
      ) : (
        <div className="border rounded-lg bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role Atual</TableHead>
                <TableHead className="w-[200px]">Alterar Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers?.map((userProfile) => (
                <TableRow key={userProfile.id}>
                  <TableCell className="font-medium">
                    {userProfile.name}
                    {userProfile.user_id === user?.id && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        Você
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {userProfile.email || "-"}
                  </TableCell>
                  <TableCell>{getRoleBadge(userProfile.role)}</TableCell>
                  <TableCell>
                    <Select
                      value={userProfile.role || "none"}
                      onValueChange={(value) =>
                        handleRoleChange(
                          userProfile,
                          value === "none" ? "remove" : value
                        )
                      }
                      disabled={isPending}
                    >
                      <SelectTrigger className="w-[160px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4" />
                            Admin
                          </div>
                        </SelectItem>
                        <SelectItem value="user">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            User
                          </div>
                        </SelectItem>
                        <SelectItem value="none">
                          <span className="text-muted-foreground">
                            Sem role
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog
        open={confirmDialog?.open}
        onOpenChange={(open) => !open && setConfirmDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Confirmar alteração de permissão
            </DialogTitle>
            <DialogDescription>
              {confirmDialog?.newRole === "remove" ? (
                <>
                  Deseja remover a role{" "}
                  <strong>{confirmDialog?.currentRole}</strong> de{" "}
                  <strong>{confirmDialog?.userName}</strong>?
                </>
              ) : confirmDialog?.newRole === "admin" ? (
                <>
                  <span className="text-amber-500 font-medium">Atenção:</span>{" "}
                  Você está prestes a dar permissões de{" "}
                  <strong>Administrador</strong> para{" "}
                  <strong>{confirmDialog?.userName}</strong>. Esta pessoa terá
                  acesso total ao sistema.
                </>
              ) : (
                <>
                  Deseja alterar a role de{" "}
                  <strong>{confirmDialog?.userName}</strong> para{" "}
                  <strong>{confirmDialog?.newRole}</strong>?
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialog(null)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmRoleChange}
              disabled={isPending}
              variant={
                confirmDialog?.newRole === "admin" ? "default" : "default"
              }
            >
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
