import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useSettings, useUpdateSetting } from "@/hooks/useSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save, Loader2, Phone, Key, Info, Globe, Copy, Check, Tv, RotateCcw, Wrench, Github } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_TV_CHANNELS_JSON = JSON.stringify(
  [
    { name: "ESPN",       domain: "espn.com",           localLogo: "/channels/espn.svg" },
    { name: "SporTV",     domain: "sportv.globo.com",   localLogo: "/channels/sportv.svg" },
    { name: "Globo",      domain: "globo.com",          localLogo: "/channels/globo.svg" },
    { name: "Premiere",   domain: "premiere.globo.com", localLogo: "/channels/premiere.svg" },
    { name: "TNT Sports", domain: "tntsports.com.br",   localLogo: "/channels/tnt-sports.svg" },
    { name: "Band",       domain: "band.uol.com.br",    localLogo: "/channels/band.svg" },
    { name: "CazéTV",     domain: "cazetv.com.br",      localLogo: "/channels/cazetv-v2.png" },
    { name: "Record",     domain: "recordtv.r7.com",    localLogo: "/channels/record.svg" },
    { name: "Canal GOAT", domain: "canalgoat.com",      localLogo: "/channels/goat.svg" },
    { name: "Space",      domain: "tntsports.com.br",   localLogo: "/channels/space.svg" },
    { name: "DAZN",       domain: "dazn.com",           localLogo: "/channels/dazn.svg" },
    { name: "YouTube",    domain: "youtube.com",        localLogo: "/channels/youtube.svg" },
  ],
  null,
  2,
);

const AdminConfiguracoes = () => {
  const { data: settings, isLoading } = useSettings();
  const updateSetting = useUpdateSetting();
  const [whatsapp, setWhatsapp] = useState("");
  const [tmdbKey, setTmdbKey] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [tvChannelsJson, setTvChannelsJson] = useState("");
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (settings) {
      setWhatsapp(settings.whatsapp || "");
      setTmdbKey(settings.tmdb_api_key || "");
      setSiteUrl(settings.site_url || "");
      setTvChannelsJson(settings.tv_channels || DEFAULT_TV_CHANNELS_JSON);
    }
  }, [settings]);

  const isDirty = useMemo(() => {
    if (!settings) return false;
    return (
      whatsapp !== (settings.whatsapp || "") ||
      tmdbKey !== (settings.tmdb_api_key || "") ||
      siteUrl !== (settings.site_url || "") ||
      tvChannelsJson !== (settings.tv_channels || DEFAULT_TV_CHANNELS_JSON)
    );
  }, [whatsapp, tmdbKey, siteUrl, tvChannelsJson, settings]);

  const handleSave = async () => {
    if (whatsapp && !/^\d{10,15}$/.test(whatsapp)) {
      toast.error("WhatsApp inválido — use apenas números (10-15 dígitos)");
      return;
    }

    if (siteUrl) {
      try {
        const u = new URL(siteUrl);
        if (!/^https?:$/.test(u.protocol)) throw new Error("protocolo");
      } catch {
        toast.error("URL do site inválida — use o formato https://meusite.com");
        return;
      }
    }

    if (tvChannelsJson) {
      try {
        const parsed = JSON.parse(tvChannelsJson);
        if (!Array.isArray(parsed)) throw new Error("array");
      } catch {
        toast.error("JSON dos canais inválido");
        return;
      }
    }

    try {
      await Promise.all([
        updateSetting.mutateAsync({ key: "whatsapp", value: whatsapp }),
        updateSetting.mutateAsync({ key: "tmdb_api_key", value: tmdbKey }),
        updateSetting.mutateAsync({ key: "site_url", value: siteUrl }),
        updateSetting.mutateAsync({ key: "tv_channels", value: tvChannelsJson }),
      ]);
      setSaved(true);
      toast.success("Configurações salvas!");
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleCopyUrl = () => {
    if (siteUrl) {
      navigator.clipboard.writeText(siteUrl);
      setCopied(true);
      toast.success("URL copiada!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4 max-w-lg">
      {/* Contact */}
      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/[0.06]">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Phone className="h-4 w-4 text-emerald-400" />
            Contato
          </h3>
        </div>
        <div className="p-4 space-y-2">
          <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">WhatsApp</Label>
          <Input inputMode="numeric" placeholder="5511940759046" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className="glass-panel border-white/[0.1] h-11" />
          <p className="text-[11px] text-muted-foreground/60">Número completo com código do país (apenas números, 10-15 dígitos)</p>
        </div>
      </div>

      {/* Site URL */}
      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/[0.06]">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Globe className="h-4 w-4 text-purple-400" />
            URL do Site
          </h3>
        </div>
        <div className="p-4 space-y-2">
          <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">URL Pública</Label>
          <div className="flex gap-2">
            <Input inputMode="url" placeholder="https://meusite.lovable.app" value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} className="glass-panel border-white/[0.1] h-11 flex-1" />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleCopyUrl}
              disabled={!siteUrl}
              className="h-11 w-11 shrink-0"
              aria-label="Copiar URL do site"
              title="Copiar URL"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground/60">URL pública do site usada nos links de compartilhamento (WhatsApp, etc). Publique o app e cole a URL aqui.</p>
        </div>
      </div>

      {/* API */}
      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/[0.06]">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Key className="h-4 w-4 text-blue-400" />
            API
          </h3>
        </div>
        <div className="p-4 space-y-2">
          <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">TMDB API Key</Label>
          <Input placeholder="Sua chave da API do TMDB" value={tmdbKey} onChange={(e) => setTmdbKey(e.target.value)} type="password" autoComplete="off" className="glass-panel border-white/[0.1] h-11" />
          <p className="text-[11px] text-muted-foreground/60">
            Obtenha em{" "}
            <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noreferrer" className="text-primary hover:underline font-medium">themoviedb.org</a>
          </p>
        </div>
      </div>

      {/* TV Channels (página Assinar) */}
      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Tv className="h-4 w-4 text-primary" />
            Canais & Streaming (Assinar)
          </h3>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setTvChannelsJson(DEFAULT_TV_CHANNELS_JSON)}
            className="h-9 px-2 text-[11px] min-h-9"
            aria-label="Restaurar padrão da lista de canais"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Restaurar padrão
          </Button>
        </div>
        <div className="p-4 space-y-2">
          <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Lista (JSON)</Label>
          <Textarea
            value={tvChannelsJson}
            onChange={(e) => setTvChannelsJson(e.target.value)}
            rows={10}
            spellCheck={false}
            className="glass-panel border-white/[0.1] font-mono text-[11px] leading-snug"
          />
          <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
            Cada canal: <code className="text-primary/80">{`{ name, domain, localLogo }`}</code>. O <code>localLogo</code> aceita caminhos de <code>/channels/*.svg</code>; se ausente, o ícone é buscado pelo <code>domain</code>.
          </p>
        </div>
      </div>

      {/* Ferramentas técnicas */}
      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/[0.06]">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Wrench className="h-4 w-4 text-sky-400" />
            Ferramentas técnicas
          </h3>
        </div>
        <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">Diagnóstico GitHub</p>
            <p className="text-[11px] text-muted-foreground/70">Verifica a conexão do repositório e a publicação do app. Uso ocasional.</p>
          </div>
          <Button asChild variant="outline" size="sm" className="min-h-11 gap-1.5 border-white/[0.1]">
            <Link to="/admin/diagnostico-github"><Github className="h-4 w-4" /> Ver detalhes</Link>
          </Button>
        </div>
      </div>

      {/* About */}
      <div className="glass-panel rounded-xl p-4">
        <div className="flex items-center gap-2">
          <Info className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-[11px] text-muted-foreground">Brito Solutions — Painel v1.0</p>
        </div>
      </div>

      {/* Save */}
      <Button
        onClick={handleSave}
        disabled={updateSetting.isPending || !isDirty}
        className="w-full min-h-[48px] text-sm font-semibold shadow-lg shadow-primary/20 transition-all duration-200"
        aria-label={saved ? "Configurações salvas" : "Salvar configurações"}
      >
        {updateSetting.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : saved ? (
          <Check className="h-4 w-4 mr-2 text-emerald-400" />
        ) : (
          <Save className="h-4 w-4 mr-2" />
        )}
        {saved ? "Salvo!" : "Salvar"}
      </Button>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {saved ? "Configurações salvas com sucesso" : ""}
      </p>
    </div>
  );
};

export default AdminConfiguracoes;
