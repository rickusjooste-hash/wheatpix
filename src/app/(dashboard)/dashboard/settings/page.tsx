"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

interface Branding {
  id?: string;
  company_name: string;
  tagline: string | null;
  logo_path: string | null;
  header_image_path: string | null;
  cover_image_path: string | null;
  badge_image_path: string | null;
  primary_color: string;
  secondary_color: string;
  agent_name: string | null;
  agent_phone: string | null;
  agent_email: string | null;
  agent_website: string | null;
}

const EMPTY_BRANDING: Branding = {
  company_name: "",
  tagline: null,
  logo_path: null,
  header_image_path: null,
  cover_image_path: null,
  badge_image_path: null,
  primary_color: "#D4890A",
  secondary_color: "#666666",
  agent_name: null,
  agent_phone: null,
  agent_email: null,
  agent_website: null,
};

type ImageField = "logo_path" | "header_image_path" | "cover_image_path" | "badge_image_path";

export default function SettingsPage() {
  const supabase = createClient();
  const [branding, setBranding] = useState<Branding>(EMPTY_BRANDING);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [userId, setUserId] = useState("");
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data } = await supabase
        .from("agent_branding" as never)
        .select("*")
        .eq("user_id" as never, user.id as never)
        .single();

      if (data) {
        const b = data as unknown as Branding & { id: string };
        setBranding(b);

        // Load all image URLs
        const urls: Record<string, string> = {};
        for (const field of ["logo_path", "header_image_path", "cover_image_path", "badge_image_path"] as const) {
          if (b[field]) {
            const { data: urlData } = supabase.storage.from("agent-logos").getPublicUrl(b[field]!);
            urls[field] = urlData.publicUrl;
          }
        }
        setImageUrls(urls);
      }
      setLoading(false);
    }
    load();
  }, [supabase]);

  const handleImageUpload = async (field: ImageField, file: File) => {
    if (!userId) return;
    const ext = file.name.split(".").pop() || "png";
    const fieldName = field.replace("_path", "");
    const path = `${userId}/${fieldName}.${ext}`;

    if (branding[field]) {
      await supabase.storage.from("agent-logos").remove([branding[field]!]);
    }

    const { error } = await supabase.storage.from("agent-logos").upload(path, file, { upsert: true });
    if (!error) {
      setBranding((prev) => ({ ...prev, [field]: path }));
      const { data: urlData } = supabase.storage.from("agent-logos").getPublicUrl(path);
      setImageUrls((prev) => ({ ...prev, [field]: urlData.publicUrl }));
    }
  };

  const handleSave = async () => {
    if (!userId || !branding.company_name.trim()) return;
    setSaving(true);

    const payload = {
      user_id: userId,
      company_name: branding.company_name.trim(),
      tagline: branding.tagline?.trim() || null,
      logo_path: branding.logo_path,
      header_image_path: branding.header_image_path,
      cover_image_path: branding.cover_image_path,
      badge_image_path: branding.badge_image_path,
      primary_color: branding.primary_color,
      secondary_color: branding.secondary_color,
      agent_name: branding.agent_name?.trim() || null,
      agent_phone: branding.agent_phone?.trim() || null,
      agent_email: branding.agent_email?.trim() || null,
      agent_website: branding.agent_website?.trim() || null,
      updated_at: new Date().toISOString(),
    };

    if (branding.id) {
      await supabase.from("agent_branding" as never).update(payload as never).eq("id" as never, branding.id as never);
    } else {
      const { data } = await supabase.from("agent_branding" as never).insert(payload as never).select("id").single();
      if (data) setBranding((prev) => ({ ...prev, id: (data as { id: string }).id }));
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) return <div style={{ color: "#999", fontSize: "14px" }}>Laai...</div>;

  const inputStyle: React.CSSProperties = {
    padding: "10px 14px",
    background: "#fff",
    border: "1px solid #d4d4d0",
    borderRadius: "8px",
    color: "#1a1a1a",
    fontSize: "14px",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  };

  const ImageUploadField = ({ label, field, hint, previewHeight = 60 }: { label: string; field: ImageField; hint: string; previewHeight?: number }) => (
    <div>
      <label style={{ display: "block", fontSize: "13px", color: "#6b6b6b", marginBottom: "4px", fontWeight: 500 }}>
        {label}
      </label>
      <div style={{ fontSize: "11px", color: "#bbb", marginBottom: "6px" }}>{hint}</div>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {imageUrls[field] ? (
          <img
            src={imageUrls[field]}
            alt={label}
            style={{ height: `${previewHeight}px`, maxWidth: "180px", objectFit: "contain", borderRadius: "6px", border: "1px solid #e8e8e4" }}
          />
        ) : (
          <div style={{ width: "80px", height: `${previewHeight}px`, borderRadius: "6px", border: "2px dashed #d4d4d0", display: "flex", alignItems: "center", justifyContent: "center", color: "#bbb", fontSize: "16px" }}>
            +
          </div>
        )}
        <input
          ref={(el) => { fileRefs.current[field] = el; }}
          type="file"
          accept="image/*"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(field, f); }}
          style={{ display: "none" }}
        />
        <button
          onClick={() => fileRefs.current[field]?.click()}
          style={{ padding: "6px 14px", background: "#fff", border: "1px solid #d4d4d0", borderRadius: "6px", color: "#6b6b6b", fontSize: "12px", cursor: "pointer" }}
        >
          {imageUrls[field] ? "Verander" : "Laai op"}
        </button>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#1a1a1a", margin: 0 }}>Instellings</h1>
        <p style={{ fontSize: "14px", color: "#999", margin: "4px 0 0" }}>Pas jou verslag sjabloon aan</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px" }}>
        {/* Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Company Info */}
          <div style={{ background: "#fff", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)" }}>
            <h2 style={{ fontSize: "14px", fontWeight: 600, color: "#1a1a1a", margin: "0 0 16px", textTransform: "uppercase", letterSpacing: "1px" }}>Maatskappy</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", color: "#6b6b6b", marginBottom: "6px", fontWeight: 500 }}>Naam</label>
                <input type="text" value={branding.company_name} onChange={(e) => setBranding((prev) => ({ ...prev, company_name: e.target.value }))} placeholder="bv. Nexus AG" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", color: "#6b6b6b", marginBottom: "6px", fontWeight: 500 }}>Slagspreuk</label>
                <input type="text" value={branding.tagline || ""} onChange={(e) => setBranding((prev) => ({ ...prev, tagline: e.target.value }))} placeholder="bv. CUSTOMISED CROP SOLUTIONS" style={inputStyle} />
              </div>
              <div style={{ display: "flex", gap: "16px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: "13px", color: "#6b6b6b", marginBottom: "6px", fontWeight: 500 }}>Primêre Kleur</label>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input type="color" value={branding.primary_color} onChange={(e) => setBranding((prev) => ({ ...prev, primary_color: e.target.value }))} style={{ width: "36px", height: "36px", border: "none", borderRadius: "6px", cursor: "pointer" }} />
                    <input type="text" value={branding.primary_color} onChange={(e) => setBranding((prev) => ({ ...prev, primary_color: e.target.value }))} style={{ ...inputStyle, width: "100px", fontFamily: "var(--font-jetbrains), monospace", fontSize: "12px" }} />
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: "13px", color: "#6b6b6b", marginBottom: "6px", fontWeight: 500 }}>Sekondêre Kleur</label>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input type="color" value={branding.secondary_color} onChange={(e) => setBranding((prev) => ({ ...prev, secondary_color: e.target.value }))} style={{ width: "36px", height: "36px", border: "none", borderRadius: "6px", cursor: "pointer" }} />
                    <input type="text" value={branding.secondary_color} onChange={(e) => setBranding((prev) => ({ ...prev, secondary_color: e.target.value }))} style={{ ...inputStyle, width: "100px", fontFamily: "var(--font-jetbrains), monospace", fontSize: "12px" }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Agent Details */}
          <div style={{ background: "#fff", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)" }}>
            <h2 style={{ fontSize: "14px", fontWeight: 600, color: "#1a1a1a", margin: "0 0 16px", textTransform: "uppercase", letterSpacing: "1px" }}>Agent Besonderhede</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", color: "#6b6b6b", marginBottom: "6px", fontWeight: 500 }}>Volle Naam</label>
                <input type="text" value={branding.agent_name || ""} onChange={(e) => setBranding((prev) => ({ ...prev, agent_name: e.target.value }))} placeholder="bv. Marius Carstens" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", color: "#6b6b6b", marginBottom: "6px", fontWeight: 500 }}>Telefoon</label>
                <input type="tel" value={branding.agent_phone || ""} onChange={(e) => setBranding((prev) => ({ ...prev, agent_phone: e.target.value }))} placeholder="bv. 082 123 4567" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", color: "#6b6b6b", marginBottom: "6px", fontWeight: 500 }}>E-pos</label>
                <input type="email" value={branding.agent_email || ""} onChange={(e) => setBranding((prev) => ({ ...prev, agent_email: e.target.value }))} placeholder="bv. marius@nexusag.net" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", color: "#6b6b6b", marginBottom: "6px", fontWeight: 500 }}>Webwerf</label>
                <input type="url" value={branding.agent_website || ""} onChange={(e) => setBranding((prev) => ({ ...prev, agent_website: e.target.value }))} placeholder="bv. www.nexusag.net" style={inputStyle} />
              </div>
            </div>
          </div>

          {/* Images */}
          <div style={{ background: "#fff", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)" }}>
            <h2 style={{ fontSize: "14px", fontWeight: 600, color: "#1a1a1a", margin: "0 0 16px", textTransform: "uppercase", letterSpacing: "1px" }}>Beelde</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <ImageUploadField label="Logo" field="logo_path" hint="Jou maatskappy logo (voorblad + voetskrif)" previewHeight={50} />
              <ImageUploadField label="Kopband" field="header_image_path" hint="Banier beeld vir bladsy koppe (bv. koring veld)" previewHeight={40} />
              <ImageUploadField label="Voorblad Beeld" field="cover_image_path" hint="Dekoratiewe beeld vir die voorblad (regterkant)" previewHeight={80} />
              <ImageUploadField label="Kenteken" field="badge_image_path" hint="Hoek kenteken (bv. herdenking, sertifisering)" previewHeight={40} />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving || !branding.company_name.trim()}
            style={{ padding: "14px 24px", background: saved ? "#4a9a4a" : "#1a1a1a", border: "none", borderRadius: "8px", color: "#fff", fontSize: "14px", fontWeight: 600, cursor: "pointer", transition: "background 0.2s" }}
          >
            {saved ? "Gestoor!" : saving ? "Stoor..." : "Stoor Instellings"}
          </button>
        </div>

        {/* Live Preview */}
        <div style={{ position: "sticky", top: "40px", alignSelf: "start" }}>
          <div style={{ background: "#fff", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)" }}>
            <h2 style={{ fontSize: "14px", fontWeight: 600, color: "#1a1a1a", margin: "0 0 16px", textTransform: "uppercase", letterSpacing: "1px" }}>Voorblad Voorskou</h2>

            {/* Cover page preview */}
            <div style={{ border: "1px solid #e8e8e4", borderRadius: "8px", overflow: "hidden", aspectRatio: "1.414", display: "flex", background: "#fff", position: "relative" }}>
              {/* Left content */}
              <div style={{ flex: 1, padding: "24px", display: "flex", flexDirection: "column", justifyContent: "center", zIndex: 1 }}>
                {imageUrls.logo_path && (
                  <img src={imageUrls.logo_path} alt="" style={{ height: "40px", objectFit: "contain", alignSelf: "flex-start", marginBottom: "4px" }} />
                )}
                {branding.tagline && (
                  <div style={{ fontSize: "7px", color: branding.secondary_color, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "16px" }}>
                    {branding.tagline}
                  </div>
                )}
                <div style={{ fontSize: "18px", fontWeight: 700, color: "#1a1a1a" }}>
                  Kamina
                </div>
                <div style={{ fontSize: "10px", color: branding.primary_color, marginTop: "4px" }}>
                  Kamp inspeksie verslag
                </div>
                <div style={{ fontSize: "22px", fontWeight: 700, color: "#1a1a1a", marginTop: "2px" }}>
                  {new Date().getFullYear()}
                </div>
                <div style={{ fontSize: "8px", color: "#999", marginTop: "8px", fontStyle: "italic" }}>
                  Marius Carstens
                </div>
              </div>
              {/* Right decorative image */}
              {imageUrls.cover_image_path && (
                <div style={{ width: "45%", position: "relative" }}>
                  <img src={imageUrls.cover_image_path} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              )}
              {/* Badge */}
              {imageUrls.badge_image_path && (
                <img src={imageUrls.badge_image_path} alt="" style={{ position: "absolute", top: "8px", left: "8px", height: "24px", objectFit: "contain" }} />
              )}
              {/* Footer */}
              <div style={{ position: "absolute", bottom: "4px", right: "8px", fontSize: "6px", color: "#ccc" }}>
                Powered by WheatPix
              </div>
            </div>

            {/* Inner page preview */}
            <div style={{ marginTop: "16px" }}>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "#999", marginBottom: "8px" }}>Binne-bladsy Voorskou</div>
              <div style={{ border: "1px solid #e8e8e4", borderRadius: "8px", overflow: "hidden", aspectRatio: "1.414" }}>
                {/* Header bar */}
                <div
                  style={{
                    height: "28px",
                    background: imageUrls.header_image_path ? `url(${imageUrls.header_image_path}) center/cover` : branding.primary_color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    padding: "0 12px",
                    position: "relative",
                  }}
                >
                  {imageUrls.badge_image_path && (
                    <img src={imageUrls.badge_image_path} alt="" style={{ position: "absolute", left: "8px", height: "18px", objectFit: "contain" }} />
                  )}
                  <span style={{ color: "#fff", fontSize: "9px", fontWeight: 700, textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}>
                    Kamp inspeksie {new Date().getFullYear()}
                  </span>
                </div>
                {/* Content placeholder */}
                <div style={{ padding: "12px", flex: 1 }}>
                  <div style={{ fontSize: "7px", color: "#bbb", textTransform: "uppercase" }}>Kampnaam:</div>
                  <div style={{ fontSize: "10px", fontWeight: 700, color: "#1a1a1a", marginBottom: "8px" }}>WERFKAMP</div>
                  <div style={{ fontSize: "7px", color: "#666" }}>1. Ramenas</div>
                  <div style={{ fontSize: "7px", color: "#666" }}>2. Canola</div>
                  <div style={{ fontSize: "7px", color: "#bbb", marginTop: "6px", textTransform: "uppercase" }}>Strategie:</div>
                  <div style={{ fontSize: "7px", color: "#666" }}>1. Bromoxanil</div>
                </div>
                {/* Footer with logo */}
                <div style={{ padding: "4px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #f0f0ec" }}>
                  <span style={{ fontSize: "5px", color: "#ccc" }}>Powered by WheatPix</span>
                  {imageUrls.logo_path && <img src={imageUrls.logo_path} alt="" style={{ height: "12px", objectFit: "contain" }} />}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
