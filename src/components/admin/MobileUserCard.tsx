import { Mail, ShieldCheck, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserWithRole {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  role: AppRole | null;
}

interface MobileUserCardProps {
  userProfile: UserWithRole;
  isCurrentUser: boolean;
  isPending: boolean;
  onRoleChange: (userProfile: UserWithRole, newRole: string) => void;
}

export function MobileUserCard({ 
  userProfile, 
  isCurrentUser, 
  isPending, 
  onRoleChange 
}: MobileUserCardProps) {
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

  return (
    <Card className="glass-card">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground truncate">{userProfile.name}</h3>
              {isCurrentUser && (
                <Badge variant="outline" className="text-xs shrink-0">
                  Você
                </Badge>
              )}
            </div>
            
            {userProfile.email && (
              <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                <Mail className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{userProfile.email}</span>
              </div>
            )}
          </div>
          
          {getRoleBadge(userProfile.role)}
        </div>
        
        <div className="pt-3 border-t border-border/50">
          <label className="text-xs text-muted-foreground mb-1.5 block">Alterar Role</label>
          <Select
            value={userProfile.role || "none"}
            onValueChange={(value) =>
              onRoleChange(userProfile, value === "none" ? "remove" : value)
            }
            disabled={isPending}
          >
            <SelectTrigger className="w-full bg-secondary">
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
                <span className="text-muted-foreground">Sem role</span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
