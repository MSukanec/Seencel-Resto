"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowRight, Loader2, User, Store } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useOrderContext } from "./layout";

export default function OrderWelcomePage() {
    const router = useRouter();
    const params = useParams();
    const restaurantId = params.restaurantId as string;
    const { restaurant } = useOrderContext();
    const [loading, setLoading] = useState(false);

    const handleGoogleLogin = async () => {
        setLoading(true);
        const supabase = createClient();

        await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: `${window.location.origin}/order/${restaurantId}/info`,
            },
        });
    };

    const handleSkip = () => {
        sessionStorage.setItem("order_guest", "true");
        router.push(`/order/${restaurantId}/info`);
    };

    const hasBanner = !!restaurant?.banner_url;

    return (
        <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
            {/* Hero Banner */}
            {hasBanner ? (
                <div className="relative h-56 md:h-72 overflow-hidden">
                    <img
                        src={restaurant.banner_url!}
                        alt={restaurant.name}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/50 to-transparent" />

                    {/* Logo overlay on banner */}
                    <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center pb-4">
                        {restaurant?.logo_url && (
                            <div className="relative w-20 h-20 mb-2">
                                <img
                                    src={restaurant.logo_url}
                                    alt={restaurant.name}
                                    className="w-20 h-20 rounded-2xl object-cover shadow-2xl border-2 border-white/20"
                                />
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                /* Fallback when no banner */
                <div className="relative py-12 overflow-hidden">
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/5 rounded-full blur-[120px]" />
                        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-white/3 rounded-full blur-[120px]" />
                    </div>
                    <div className="relative z-10 flex flex-col items-center">
                        {restaurant?.logo_url ? (
                            <div className="relative w-28 h-28">
                                <div className="absolute inset-0 bg-white/10 rounded-3xl blur-xl" />
                                <img
                                    src={restaurant.logo_url}
                                    alt={restaurant.name}
                                    className="relative w-28 h-28 rounded-3xl object-cover shadow-2xl border border-white/10"
                                />
                            </div>
                        ) : (
                            <div className="relative w-28 h-28">
                                <div className="absolute inset-0 bg-white/10 rounded-3xl blur-xl" />
                                <div className="relative w-28 h-28 rounded-3xl bg-white/5 flex items-center justify-center border border-white/10">
                                    <Store size={48} className="text-white/60" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Main content */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 relative z-10">
                <div className="w-full max-w-md space-y-8">
                    {/* Restaurant info */}
                    <div className="text-center space-y-2">
                        <h1 className="text-3xl font-bold tracking-tight text-white">
                            {restaurant?.name || "Restaurante"}
                        </h1>
                        <p className="text-white/40 text-lg">
                            Hacé tu pedido fácil y rápido
                        </p>
                    </div>

                    {/* Auth options */}
                    <div className="space-y-4">
                        {/* Google Login Button */}
                        <button
                            onClick={handleGoogleLogin}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 px-6 py-4 rounded-2xl font-semibold shadow-2xl shadow-white/5 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <Loader2 className="animate-spin" size={22} />
                            ) : (
                                <>
                                    <svg width="22" height="22" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                    Continuar con Google
                                </>
                            )}
                        </button>

                        {/* Divider */}
                        <div className="relative py-2">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-white/10" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-[#0a0a0a] px-4 text-white/30 font-medium tracking-wider">
                                    o
                                </span>
                            </div>
                        </div>

                        {/* Skip Button */}
                        <button
                            onClick={handleSkip}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 text-white/80 px-6 py-4 rounded-2xl font-medium transition-all disabled:opacity-50 border border-white/10"
                        >
                            <User size={20} className="text-white/40" />
                            Continuar sin cuenta
                            <ArrowRight size={18} className="ml-auto text-white/40" />
                        </button>
                    </div>

                    {/* Benefits hint */}
                    <p className="text-center text-sm text-white/30">
                        Al iniciar sesión podrás guardar tus pedidos favoritos<br />
                        y acceder a promociones exclusivas
                    </p>
                </div>
            </div>

            {/* Footer */}
            <div className="p-6 text-center text-xs text-white/20">
                Powered by <span className="font-semibold text-white/40">Seencel<span className="text-white/60">Resto</span></span>
            </div>
        </div>
    );
}
