import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background relative overflow-hidden">
      {/* Ambient blobs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-primary/5 blur-[100px] animate-blob-a" />
      <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-secondary/5 blur-[80px] animate-blob-b" />

      <div className="text-center space-y-6 px-6 animate-fade-up relative z-10">
        <h1
          className="font-display text-primary leading-none"
          style={{ fontSize: "clamp(5rem, 20vw, 10rem)" }}
        >
          404
        </h1>
        <p className="text-lg text-muted-foreground font-body">
          Página não encontrada
        </p>
        <p className="text-sm text-muted-foreground/60 font-body max-w-xs mx-auto">
          O conteúdo que você procura pode ter sido movido ou não existe mais.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-body font-bold text-sm px-6 py-3 rounded-xl hover:opacity-90 transition-opacity min-h-[44px]"
        >
          ← Voltar ao início
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
