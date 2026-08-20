import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useBranch } from '@/context/BranchContext';
import toast from 'react-hot-toast';
import {
  User,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Camera,
  Save,
  ShieldCheck,
  Building2,
  AtSign,
  Loader2,
  KeyRound,
} from 'lucide-react';

// ─── Helpers ────────────────────────────────────────────────────────────────

const SUPABASE_STORAGE_URL =
  'https://dyfwcubkvgcqufpmtgvh.supabase.co/storage/v1/object/public/avatars';

function getAvatarUrl(path: string) {
  return `${SUPABASE_STORAGE_URL}/${path}`;
}

function formatRole(role: string): string {
  const map: Record<string, string> = {
    admin: 'Administrador',
    manager: 'Gerente',
    cashier: 'Cajero',
    supervisor: 'Supervisor',
  };
  return map[role] ?? role.charAt(0).toUpperCase() + role.slice(1);
}

function getRoleBadgeClass(role: string): string {
  const map: Record<string, string> = {
    admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    manager: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    cashier: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    supervisor: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  };
  return map[role] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
}

function getInitials(fullName: string): string {
  return fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('');
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { profile, user } = useAuth();
  const { selectedBranch } = useBranch();

  // ── Profile form state ──
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [savingProfile, setSavingProfile] = useState(false);

  // ── Avatar state ──
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    profile?.avatar_url ? getAvatarUrl(profile.avatar_url) : null,
  );
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Password form state ──
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Sync profile data when context updates
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '');
      setPhone(profile.phone ?? '');
      setAvatarUrl(profile.avatar_url ? getAvatarUrl(profile.avatar_url) : null);
    }
  }, [profile]);

  // ── Avatar upload ──────────────────────────────────────────────────────────
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    if (!allowedExts.includes(ext)) {
      toast.error('Formato de imagen no válido. Use JPG, PNG o WEBP.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('La imagen no debe superar 2 MB.');
      return;
    }

    const storagePath = `${user.id}/avatar.${ext}`;

    setUploadingAvatar(true);
    try {
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(storagePath, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: storagePath })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Add cache-buster so the browser reloads the new image
      setAvatarUrl(`${getAvatarUrl(storagePath)}?t=${Date.now()}`);
      toast.success('Foto de perfil actualizada.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al subir la foto.';
      toast.error(message);
    } finally {
      setUploadingAvatar(false);
      // Reset input so the same file can be re-selected if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── Save profile ───────────────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    if (!user) return;

    if (!fullName.trim()) {
      toast.error('El nombre completo no puede estar vacío.');
      return;
    }

    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          phone: phone.trim() || null,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Perfil actualizado correctamente.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar el perfil.';
      toast.error(message);
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Change password ────────────────────────────────────────────────────────
  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden.');
      return;
    }

    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast.success('Contraseña actualizada correctamente.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al cambiar la contraseña.';
      toast.error(message);
    } finally {
      setSavingPassword(false);
    }
  };

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
      </div>
    );
  }

  const initials = getInitials(profile.full_name ?? profile.username ?? '?');
  const branchName = selectedBranch?.name ?? '—';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-6">

        {/* ── Page title ── */}
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-sky-500 to-cyan-400 bg-clip-text text-transparent">
            Mi Perfil
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Administra tu información personal y seguridad
          </p>
        </div>

        {/* ── Profile card ── */}
        <div className="rounded-2xl bg-white dark:bg-gray-900 shadow-lg p-6 flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="h-24 w-24 rounded-full overflow-hidden ring-4 ring-sky-500/30 bg-gradient-to-br from-sky-400 to-cyan-500 flex items-center justify-center">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="h-full w-full object-cover"
                  onError={() => setAvatarUrl(null)}
                />
              ) : (
                <span className="text-3xl font-bold text-white select-none">{initials}</span>
              )}
            </div>

            {/* Upload button overlay */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-sky-500 hover:bg-sky-600 text-white shadow-md transition-colors disabled:opacity-60"
              title="Cambiar foto"
            >
              {uploadingAvatar ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          {/* Info */}
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
              {profile.full_name ?? profile.username}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center sm:justify-start gap-1 mt-0.5">
              <AtSign className="h-3.5 w-3.5" />
              {profile.username}
            </p>

            <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${getRoleBadgeClass(profile.role)}`}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                {formatRole(profile.role)}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-3 py-1 text-xs font-semibold">
                <Building2 className="h-3.5 w-3.5" />
                {branchName}
              </span>
            </div>
          </div>
        </div>

        {/* ── Edit profile ── */}
        <div className="rounded-2xl bg-white dark:bg-gray-900 shadow-lg p-6 space-y-5">
          <h3 className="text-base font-semibold bg-gradient-to-r from-sky-500 to-cyan-400 bg-clip-text text-transparent flex items-center gap-2">
            <User className="h-4 w-4 text-sky-500" />
            Información Personal
          </h3>

          {/* Editable fields */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Nombre Completo <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nombre completo"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Teléfono <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+504 0000-0000"
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 pl-10 pr-4 py-2.5 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                />
              </div>
            </div>
          </div>

          {/* Readonly fields */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-1">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Usuario
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800/60 px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400 select-none">
                <AtSign className="h-4 w-4 shrink-0" />
                {profile.username}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Rol
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800/60 px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400 select-none">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                {formatRole(profile.role)}
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Sucursal Asignada
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800/60 px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400 select-none">
                <Building2 className="h-4 w-4 shrink-0" />
                {branchName}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSaveProfile}
            disabled={savingProfile}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 hover:bg-sky-600 disabled:opacity-60 text-white font-semibold py-2.5 px-6 transition-colors"
          >
            {savingProfile ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {savingProfile ? 'Guardando…' : 'Guardar Cambios'}
          </button>
        </div>

        {/* ── Change password ── */}
        <div className="rounded-2xl bg-white dark:bg-gray-900 shadow-lg p-6 space-y-5">
          <h3 className="text-base font-semibold bg-gradient-to-r from-sky-500 to-cyan-400 bg-clip-text text-transparent flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-sky-500" />
            Cambiar Contraseña
          </h3>

          <div className="space-y-4">
            {/* Current password (UI only) */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Contraseña Actual
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Contraseña actual"
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 pl-10 pr-11 py-2.5 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  tabIndex={-1}
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* New password */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Nueva Contraseña <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 pl-10 pr-11 py-2.5 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  tabIndex={-1}
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {/* Strength hint */}
              {newPassword.length > 0 && (
                <p
                  className={`mt-1 text-xs ${
                    newPassword.length < 6
                      ? 'text-red-500'
                      : newPassword.length < 10
                      ? 'text-amber-500'
                      : 'text-emerald-500'
                  }`}
                >
                  {newPassword.length < 6
                    ? 'Contraseña muy corta'
                    : newPassword.length < 10
                    ? 'Contraseña aceptable'
                    : 'Contraseña fuerte'}
                </p>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Confirmar Nueva Contraseña <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite la nueva contraseña"
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 pl-10 pr-11 py-2.5 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {/* Match hint */}
              {confirmPassword.length > 0 && (
                <p
                  className={`mt-1 text-xs ${
                    newPassword === confirmPassword ? 'text-emerald-500' : 'text-red-500'
                  }`}
                >
                  {newPassword === confirmPassword
                    ? '✓ Las contraseñas coinciden'
                    : '✗ Las contraseñas no coinciden'}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleChangePassword}
            disabled={savingPassword || !newPassword || !confirmPassword}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 hover:bg-sky-600 disabled:opacity-60 text-white font-semibold py-2.5 px-6 transition-colors"
          >
            {savingPassword ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="h-4 w-4" />
            )}
            {savingPassword ? 'Actualizando…' : 'Actualizar Contraseña'}
          </button>
        </div>

        {/* ── Bottom spacer for mobile nav ── */}
        <div className="h-4" />
      </div>
    </div>
  );
}
