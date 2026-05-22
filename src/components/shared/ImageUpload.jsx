import { useRef, useState } from "react";
import { Upload, X, Loader2, Camera } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";

const O = "#FF6B2C";

/**
 * Sube una imagen a Supabase Storage y devuelve la URL pública.
 * folder: 'logos' | 'covers' | 'avatars'
 */
export async function uploadImage(file, folder = "logos") {
  const shopId = useAuthStore.getState().profile?.shop_id ?? "shared";
  const ext    = file.name.split(".").pop();
  const name   = `${shopId}/${folder}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from("shop-images")
    .upload(name, file, { upsert: true, contentType: file.type });

  if (error) throw error;

  const { data } = supabase.storage.from("shop-images").getPublicUrl(name);
  return data.publicUrl;
}

/**
 * Componente de subida de imagen con preview.
 * Props:
 *  - value: URL actual
 *  - onChange: (url) => void
 *  - folder: 'logos' | 'covers' | 'avatars'
 *  - label: texto del área
 *  - aspect: ratio de preview ('square' | 'wide')
 *  - capture: 'user' | 'environment' | undefined (para activar cámara en móvil)
 */
export default function ImageUpload({ value, onChange, folder = "logos", label = "Subir imagen", aspect = "wide", capture }) {
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  async function handleFile(file) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen no puede pesar más de 5MB");
      return;
    }
    setLoading(true);
    try {
      const url = await uploadImage(file, folder);
      onChange(url);
      toast.success("Imagen subida");
    } catch (err) {
      toast.error("Error al subir la imagen. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  function onInputChange(e) {
    handleFile(e.target.files[0]);
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }

  const isSquare = aspect === "square";
  const height   = isSquare ? 120 : 100;

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture={capture}
        style={{ display: "none" }}
        onChange={onInputChange}
      />

      {value ? (
        /* Preview con botón de eliminar */
        <div style={{ position: "relative", display: "inline-block", width: isSquare ? 120 : "100%" }}>
          <img
            src={value}
            alt="preview"
            style={{
              width: isSquare ? 120 : "100%",
              height,
              objectFit: "cover",
              borderRadius: 12,
              border: "1px solid #2A2A2A",
              display: "block",
            }}
          />
          <div style={{ position: "absolute", top: 6, right: 6, display: "flex", gap: 4 }}>
            <button
              onClick={() => inputRef.current.click()}
              title="Cambiar imagen"
              style={{ width: 28, height: 28, borderRadius: 7, background: "rgba(0,0,0,0.7)", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}
            >
              <Upload size={13} />
            </button>
            <button
              onClick={() => onChange("")}
              title="Eliminar imagen"
              style={{ width: 28, height: 28, borderRadius: 7, background: "rgba(239,68,68,0.8)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}
            >
              <X size={13} />
            </button>
          </div>
        </div>
      ) : (
        /* Área de drop */
        <div
          onClick={() => !loading && inputRef.current.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          style={{
            width: "100%",
            height,
            borderRadius: 12,
            border: `2px dashed ${dragging ? O : "#2A2A2A"}`,
            background: dragging ? `rgba(255,107,44,0.05)` : "#1E1E1E",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            cursor: loading ? "not-allowed" : "pointer",
            transition: "all 0.15s",
          }}
        >
          {loading ? (
            <Loader2 size={22} color="#555" style={{ animation: "spin 1s linear infinite" }} />
          ) : (
            <>
              <div style={{ display: "flex", gap: 10 }}>
                <Upload size={20} color="#555" />
                <Camera size={20} color="#555" />
              </div>
              <p style={{ color: "#555", fontSize: 13, textAlign: "center", lineHeight: 1.4 }}>
                {label}<br />
                <span style={{ fontSize: 11, color: "#444" }}>JPG, PNG, WEBP · máx 5MB</span>
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
