import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2, Plus, Image } from "lucide-react";
import { getMyBarberProfile } from "../services/barberService";
import { supabase } from "../../../lib/supabase";
import ImageUpload, { uploadImage } from "../../../components/shared/ImageUpload";

const O = "var(--brand, #FF6B2C)";

async function getPortfolio(barberId) {
  if (!barberId) return [];
  const { data, error } = await supabase
    .from("barber_portfolio")
    .select("*")
    .eq("barber_id", barberId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

async function addPortfolioItem(barberId, url, caption) {
  const { error } = await supabase
    .from("barber_portfolio")
    .insert({ barber_id: barberId, image_url: url, caption });
  if (error) throw error;
}

async function deletePortfolioItem(id) {
  const { error } = await supabase
    .from("barber_portfolio")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export default function PortfolioPage() {
  const qc = useQueryClient();
  const [adding, setAdding]   = useState(false);
  const [caption, setCaption] = useState("");
  const [imgUrl, setImgUrl]   = useState("");
  const [uploading, setUploading] = useState(false);

  const { data: barber } = useQuery({ queryKey: ["my-barber-profile"], queryFn: getMyBarberProfile });
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["my-portfolio", barber?.id],
    queryFn:  () => getPortfolio(barber?.id),
    enabled:  !!barber?.id,
  });

  const addMut = useMutation({
    mutationFn: () => addPortfolioItem(barber.id, imgUrl, caption),
    onSuccess: () => {
      qc.invalidateQueries(["my-portfolio"]);
      setAdding(false); setCaption(""); setImgUrl("");
      toast.success("Trabajo agregado ✅");
    },
    onError: () => toast.error("Error al agregar"),
  });

  const delMut = useMutation({
    mutationFn: (id) => deletePortfolioItem(id),
    onSuccess: () => { qc.invalidateQueries(["my-portfolio"]); toast.success("Eliminado"); },
  });

  async function handleFileUpload(file) {
    setUploading(true);
    try {
      const url = await uploadImage(file, "portfolio");
      setImgUrl(url);
    } catch {
      toast.error("Error al subir la foto");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text)" }}>Mis trabajos</h1>
          <p style={{ fontSize: 13, color: "var(--text-faint)", marginTop: 2 }}>Muestra tus mejores cortes</p>
        </div>
        <button
          onClick={() => setAdding(true)}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 10, background: O, border: "none", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
        >
          <Plus size={15} /> Agregar
        </button>
      </div>

      {/* Modal agregar */}
      {adding && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "0 0 0 0" }}>
          <div style={{ background: "var(--surface, #141414)", borderRadius: "20px 20px 0 0", padding: 24, width: "100%", maxWidth: 600 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", marginBottom: 16 }}>Agregar trabajo</h3>

            <ImageUpload
              value={imgUrl}
              onChange={setImgUrl}
              folder="portfolio"
              label="Toca para subir una foto de tu trabajo"
              aspect="wide"
              capture="environment"
            />

            {imgUrl && (
              <div style={{ marginTop: 12 }}>
                <label style={{ fontSize: 12, color: "var(--text-faint)", fontWeight: 600, display: "block", marginBottom: 6 }}>
                  Descripción (opcional)
                </label>
                <input
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  placeholder="Ej: Fade con diseño ✂️"
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                />
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={() => { setAdding(false); setImgUrl(""); setCaption(""); }}
                style={{ flex: 1, padding: "12px", borderRadius: 10, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-muted)", fontWeight: 600, cursor: "pointer" }}>
                Cancelar
              </button>
              <button
                onClick={() => addMut.mutate()}
                disabled={!imgUrl || addMut.isPending}
                style={{ flex: 2, padding: "12px", borderRadius: 10, background: O, border: "none", color: "#fff", fontWeight: 700, cursor: "pointer", opacity: !imgUrl ? 0.5 : 1 }}
              >
                {addMut.isPending ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grid de fotos */}
      {isLoading && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[1,2,3,4].map(i => <div key={i} style={{ aspectRatio: "1", borderRadius: 12, background: "var(--surface2)" }} />)}
        </div>
      )}

      {!isLoading && items.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 20px", border: "2px dashed var(--border)", borderRadius: 16 }}>
          <Image size={40} color="var(--text-faint)" style={{ margin: "0 auto 12px", opacity: 0.4 }} />
          <p style={{ color: "var(--text-faint)", fontSize: 14 }}>Aún no tienes trabajos</p>
          <p style={{ color: "var(--text-faint)", fontSize: 12, marginTop: 4 }}>Agrega fotos de tus mejores cortes</p>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {items.map(item => (
          <div key={item.id} style={{ position: "relative", borderRadius: 12, overflow: "hidden", aspectRatio: "1" }}>
            <img src={item.image_url} alt={item.caption ?? "trabajo"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            {item.caption && (
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "8px 10px", background: "linear-gradient(transparent, rgba(0,0,0,0.7))" }}>
                <p style={{ fontSize: 11, color: "#fff", fontWeight: 600 }}>{item.caption}</p>
              </div>
            )}
            <button
              onClick={() => delMut.mutate(item.id)}
              style={{ position: "absolute", top: 6, right: 6, width: 28, height: 28, borderRadius: 8, background: "rgba(239,68,68,0.85)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <Trash2 size={13} color="#fff" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
