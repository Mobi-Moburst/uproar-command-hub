import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuthContext } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { LogOut, Save } from "lucide-react";

export default function AccountPage() {
  const { user, profile, signOut, refreshProfile } = useAuthContext();
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    setDisplayName(profile?.display_name ?? "");
    setAvatarUrl(profile?.avatar_url ?? "");
  }, [profile]);

  const initials =
    (displayName || user?.email || "U")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  const saveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName, avatar_url: avatarUrl })
      .eq("id", user.id);
    setSavingProfile(false);
    if (error) {
      toast.error("Failed to save profile");
      return;
    }
    await refreshProfile();
    toast.success("Profile updated");
  };

  const updatePassword = async () => {
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewPassword("");
    setConfirmPassword("");
    toast.success("Password updated");
  };

  const isGoogleUser = user?.app_metadata?.provider === "google";

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-3xl space-y-8">
        <header>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Account Settings</h1>
          <p className="mt-2 text-sm text-muted-foreground font-mono">
            Manage your profile and session
          </p>
        </header>

        {/* Profile */}
        <section className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-6">
          <h2 className="text-lg font-semibold text-foreground">Profile</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Visible to teammates inside the dashboard.
          </p>

          <div className="mt-6 flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback className="bg-[#b9e045] text-base text-black font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="text-sm">
              <p className="font-medium text-foreground">{displayName || "—"}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="displayName">Display name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="avatarUrl">Avatar URL</Label>
              <Input
                id="avatarUrl"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div>
              <Button onClick={saveProfile} disabled={savingProfile} className="gap-2">
                <Save className="h-4 w-4" />
                {savingProfile ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </div>
        </section>

        {/* Password */}
        {!isGoogleUser && (
          <section className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-6">
            <h2 className="text-lg font-semibold text-foreground">Password</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Update the password used to sign in with email.
            </p>
            <div className="mt-6 grid gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="newPassword">New password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirm new password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <div>
                <Button onClick={updatePassword} disabled={savingPassword}>
                  {savingPassword ? "Updating..." : "Update password"}
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* Account info / session */}
        <section className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-6">
          <h2 className="text-lg font-semibold text-foreground">Session</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Email</dt>
              <dd className="text-foreground">{user?.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Provider</dt>
              <dd className="text-foreground capitalize">
                {String(user?.app_metadata?.provider ?? "email")}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">User ID</dt>
              <dd className="font-mono text-xs text-muted-foreground">{user?.id}</dd>
            </div>
          </dl>
          <div className="mt-6">
            <Button variant="outline" onClick={signOut} className="gap-2">
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
