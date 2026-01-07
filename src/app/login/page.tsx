"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ChefHat, Loader2, Lock, Mail } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const supabase = createClient();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                throw error;
            }

            router.refresh();
            router.push("/dashboard");
        } catch (err: unknown) {
            // Basic error translation or generic message
            const message = (err as Error).message;
            const msg = message === "Invalid login credentials"
                ? "Credenciales inválidas"
                : message || "Ocurrió un error al iniciar sesión";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4 relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-0 left-0 -z-10 h-full w-full overflow-hidden">
                <div className="absolute top-[-20%] right-[-10%] h-[600px] w-[600px] rounded-full bg-primary/5 blur-[100px]" />
                <div className="absolute bottom-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-blue-500/5 blur-[100px]" />
            </div>

            <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
                <div className="glass flex flex-col items-center rounded-2xl p-8 shadow-2xl border border-white/5 bg-card/50 backdrop-blur-xl">
                    <div className="mb-8 flex flex-col items-center text-center">
                        <Link href="/" className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_0_20px_-5px_var(--primary)]">
                            <ChefHat size={28} />
                        </Link>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">
                            Bienvenido de nuevo
                        </h1>
                        <p className="text-sm text-muted-foreground mt-2">
                            Ingresa a tu panel de restaurante
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="w-full space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground ml-1">Correo Electrónico</label>
                            <div className="relative group">
                                <Mail className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                                <input
                                    type="email"
                                    placeholder="nombre@ejemplo.com"
                                    className="w-full rounded-xl border border-border bg-background/50 py-2.5 pl-10 pr-4 text-sm outline-none transition-all placeholder:text-muted-foreground/50 focus:border-primary focus:ring-1 focus:ring-primary"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground ml-1">Contraseña</label>
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

                        {error && (
                            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-500 text-center">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="mt-4 flex w-full items-center justify-center rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_0_20px_-5px_var(--primary)] transition-all hover:scale-[1.02] hover:shadow-[0_0_30px_-5px_var(--primary)] disabled:opacity-50 disabled:pointer-events-none"
                        >
                            {loading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                "Ingresar"
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center text-xs text-muted-foreground">
                        ¿No tienes cuenta?{" "}
                        <Link href="#" className="font-medium text-primary hover:underline">
                            Contactar Administrador
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
