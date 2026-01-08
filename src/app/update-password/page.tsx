"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Lock, CheckCircle } from "lucide-react";

export default function UpdatePasswordPage() {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (password !== confirmPassword) {
            setError("Las contraseñas no coinciden");
            setLoading(false);
            return;
        }

        if (password.length < 6) {
            setError("La contraseña debe tener al menos 6 caracteres");
            setLoading(false);
            return;
        }

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) throw error;

            setSuccess(true);
            // Redirect after short delay
            setTimeout(() => {
                router.push("/restaurants");
            }, 2000);

        } catch (err: any) {
            setError(err.message || "Error al actualizar contraseña");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-0 left-0 -z-10 h-full w-full overflow-hidden">
                <div className="absolute top-[-20%] right-[-10%] h-[600px] w-[600px] rounded-full bg-primary/5 blur-[100px]" />
                <div className="absolute bottom-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-blue-500/5 blur-[100px]" />
            </div>

            <div className="w-full max-w-md">
                <div className="glass flex flex-col items-center rounded-2xl p-8 shadow-2xl border border-white/5 bg-card/50 backdrop-blur-xl">
                    <div className="mb-8 flex flex-col items-center text-center">
                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_0_20px_-5px_var(--primary)]">
                            <Lock size={28} />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">
                            Establecer Contraseña
                        </h1>
                        <p className="text-sm text-muted-foreground mt-2">
                            Crea una contraseña segura para tu cuenta.
                        </p>
                    </div>

                    {!success ? (
                        <form onSubmit={handleUpdate} className="w-full space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground ml-1">Nueva Contraseña</label>
                                <div className="relative group">
                                    <Lock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                                    <input
                                        type="password"
                                        placeholder="••••••••"
                                        className="w-full rounded-xl border border-border bg-background/50 py-2.5 pl-10 pr-4 text-sm outline-none transition-all placeholder:text-muted-foreground/50 focus:border-primary focus:ring-1 focus:ring-primary"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground ml-1">Confirmar Contraseña</label>
                                <div className="relative group">
                                    <Lock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                                    <input
                                        type="password"
                                        placeholder="••••••••"
                                        className="w-full rounded-xl border border-border bg-background/50 py-2.5 pl-10 pr-4 text-sm outline-none transition-all placeholder:text-muted-foreground/50 focus:border-primary focus:ring-1 focus:ring-primary"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-500 text-center">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="mt-4 flex w-full items-center justify-center rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_0_20px_-5px_var(--primary)] transition-all hover:scale-[1.02] hover:shadow-[0_0_30px_-5px_var(--primary)] disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : "Guardar Contraseña"}
                            </button>
                        </form>
                    ) : (
                        <div className="text-center animate-in fade-in zoom-in">
                            <div className="flex justify-center mb-4">
                                <CheckCircle className="text-green-500 h-16 w-16" />
                            </div>
                            <h3 className="text-xl font-bold text-foreground mb-2">¡Todo listo!</h3>
                            <p className="text-muted-foreground mb-4">
                                Tu contraseña ha sido establecida. Redirigiendo...
                            </p>
                            <Loader2 className="animate-spin text-primary mx-auto" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
