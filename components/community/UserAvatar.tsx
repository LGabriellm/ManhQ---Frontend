"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { mediaService } from "@/services/media.service";

function initials(name?: string) {
  const parts = (name || "Leitor").trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() || "").join("");
}

/**
 * UserAvatar — exibe avatar do usuário.
 *
 * Modos:
 * - `avatarUrl` (ex: "/account/avatar/uuid") → usa o proxy `/api${avatarUrl}` diretamente,
 *   sem fetch extra. Ideal quando a URL já foi retornada pelo endpoint GET /account.
 * - `userId` → faz fetch via api.get() (mantém o Authorization header).
 *   Útil para exibir avatares de outros usuários sem ter o avatarUrl em mãos.
 * - nenhum dos dois → exibe fallback com iniciais.
 */
export function UserAvatar({
  userId,
  avatarUrl,
  name,
  className = "h-10 w-10 rounded-2xl",
  cacheBust,
}: {
  userId?: string;
  avatarUrl?: string | null;
  name?: string;
  className?: string;
  /** Força recarregamento após upload — passe Date.now() */
  cacheBust?: number;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const blobRef = useRef<string | null>(null);

  useEffect(() => {
    // Se temos a URL direta do avatar, não precisamos fazer fetch
    if (avatarUrl) {
      const bust = cacheBust ? `?t=${cacheBust}` : "";
      setSrc(`/api${avatarUrl}${bust}`);
      setFailed(false);
      setLoading(false);
      return;
    }

    if (!userId) {
      setFailed(true);
      return;
    }

    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setFailed(false);
        const bust = cacheBust ? `?t=${cacheBust}` : "";
        const blobUrl = await mediaService.getBlobUrl(
          `/v1/account/avatar/${userId}${bust}`,
        );
        // Revogar blob anterior
        if (blobRef.current) URL.revokeObjectURL(blobRef.current);
        blobRef.current = blobUrl;
        if (mounted) setSrc(blobUrl);
      } catch {
        if (mounted) setFailed(true);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();

    return () => {
      mounted = false;
      if (blobRef.current) {
        URL.revokeObjectURL(blobRef.current);
        blobRef.current = null;
      }
    };
  }, [userId, avatarUrl, cacheBust]);

  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- source can be blob URL from authenticated fetch
      <img
        src={src}
        alt={name || "Avatar"}
        className={`${className} object-cover ring-1 ring-white/8`}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div
      className={`${className} flex items-center justify-center bg-primary/15 text-primary ring-1 ring-white/8`}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <span className="text-xs font-bold">{initials(name)}</span>
      )}
    </div>
  );
}
