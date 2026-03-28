"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

interface Branding {
  id?: string;
  company_name: string;
  logo_path: string | null;
  primary_color: string;
}

export default function SettingsPage() {
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [branding, setBranding] = useState<Branding>({
    company_name: "",
    logo_path: null,
    primary_color: "#D4890A",
  });
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [userId, setUserId] = useState("");

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
        if (b.logo_path) {
          const { data: urlData } = supabase.storage
            .from("agent-logos")
            .getPublicUrl(b.logo_path);
          setLogoUrl(urlData.publicUrl);
        }
      }
      setLoading(false);
    }
    load();
  }, [supabase]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    const ext = file.name.split(".").pop() || "png";
    const path = `${userId}/logo.${ext}`;

    // Delete old logo if exists
    if (branding.logo_path) {
      await supabase.storage.from("agent-logos").remove([branding.logo_path]);
    }

    const { error } = await supabase.storage
      .from("agent-logos")
      .upload(path, file, { upsert: true });

    if (!error) {
      setBranding((prev) => ({ ...prev, logo_path: path }));
      const { data: urlData } = supabase.storage
        .from("agent-logos")
        .getPublicUrl(path);
      setLogoUrl(urlData.publicUrl);
    }
  };

  const handleSave = async () => {
    if (!userId || !branding.company_name.trim()) return;
    setSaving(true);

    const payload = {
      user_id: userId,
      company_name: branding.company_name.trim(),
      logo_path: branding.logo_path,
      primary_color: branding.primary_color,
      updated_at: new Date().toISOString(),
    };

    if (branding.id) {
      await supabase
        .from("agent_branding" as never)
        .update(payload as never)
        .eq("id" as never, branding.id as never);
    } else {
      const { data } = await supabase
        .from("agent_branding" as never)
        .insert(payload as never)
        .select("id")
        .single();
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

  return (
    <div>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#1a1a1a", margin: 0 }}>
          Instellings
        </h1>
        <p style={{ fontSize: "14px", color: "#999", margin: "4px 0 0" }}>
          Jou maatskappy inligting vir verslae
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px" }}>
        {/* Form */}
        <div
          style={{
            background: "#fff",
            borderRadius: "12px",
            padding: "28px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)",
          }}
        >
          <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#1a1a1a", margin: "0 0 20px" }}>
            Maatskappy
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", color: "#6b6b6b", marginBottom: "6px", fontWeight: 500 }}>
                Maatskappy Naam
              </label>
              <input
                type="text"
                value={branding.company_name}
                onChange={(e) => setBranding((prev) => ({ ...prev, company_name: e.target.value }))}
                placeholder="bv. Nexus AG"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", color: "#6b6b6b", marginBottom: "6px", fontWeight: 500 }}>
                Logo
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Logo"
                    style={{ width: "60px", height: "60px", objectFit: "contain", borderRadius: "8px", border: "1px solid #e8e8e4" }}
                  />
                ) : (
                  <div
                    style={{
                      width: "60px",
                      height: "60px",
                      borderRadius: "8px",
                      border: "2px dashed #d4d4d0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#bbb",
                      fontSize: "20px",
                    }}
                  >
                    +
                  </div>
                )}
                <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: "none" }} />
                <button
                  onClick={() => fileRef.current?.click()}
                  style={{
                    padding: "8px 16px",
                    background: "#fff",
                    border: "1px solid #d4d4d0",
                    borderRadius: "8px",
                    color: "#6b6b6b",
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  {logoUrl ? "Verander" : "Laai op"}
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", color: "#6b6b6b", marginBottom: "6px", fontWeight: 500 }}>
                Primêre Kleur
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <input
                  type="color"
                  value={branding.primary_color}
                  onChange={(e) => setBranding((prev) => ({ ...prev, primary_color: e.target.value }))}
                  style={{ width: "40px", height: "40px", border: "none", borderRadius: "8px", cursor: "pointer" }}
                />
                <input
                  type="text"
                  value={branding.primary_color}
                  onChange={(e) => setBranding((prev) => ({ ...prev, primary_color: e.target.value }))}
                  style={{ ...inputStyle, width: "120px", fontFamily: "var(--font-jetbrains), monospace", fontSize: "13px" }}
                />
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving || !branding.company_name.trim()}
              style={{
                padding: "12px 24px",
                background: saved ? "#4a9a4a" : "#1a1a1a",
                border: "none",
                borderRadius: "8px",
                color: "#fff",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
                marginTop: "8px",
                transition: "background 0.2s",
              }}
            >
              {saved ? "Gestoor!" : saving ? "Stoor..." : "Stoor"}
            </button>
          </div>
        </div>

        {/* Preview */}
        <div
          style={{
            background: "#fff",
            borderRadius: "12px",
            padding: "28px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)",
          }}
        >
          <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#1a1a1a", margin: "0 0 20px" }}>
            Verslag Voorskou
          </h2>

          {/* Mini report preview */}
          <div
            style={{
              border: "1px solid #e8e8e4",
              borderRadius: "8px",
              overflow: "hidden",
              aspectRatio: "16/9",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Header bar */}
            <div
              style={{
                background: branding.primary_color,
                padding: "12px 16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ color: "#fff", fontSize: "11px", fontWeight: 700 }}>
                Kamp inspeksie {new Date().getFullYear()}
              </span>
              {logoUrl && (
                <img src={logoUrl} alt="" style={{ height: "20px", objectFit: "contain" }} />
              )}
            </div>
            {/* Content */}
            <div style={{ flex: 1, padding: "16px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              {logoUrl && (
                <img src={logoUrl} alt="" style={{ height: "40px", objectFit: "contain", marginBottom: "12px", alignSelf: "flex-start" }} />
              )}
              <div style={{ fontSize: "16px", fontWeight: 700, color: "#1a1a1a" }}>
                {branding.company_name || "Maatskappy Naam"}
              </div>
              <div style={{ fontSize: "11px", color: "#999", marginTop: "4px" }}>
                Kamp inspeksie verslag {new Date().getFullYear()}
              </div>
            </div>
            {/* Footer */}
            <div style={{ padding: "6px 16px", borderTop: "1px solid #f0f0ec", textAlign: "right" }}>
              <span style={{ fontSize: "8px", color: "#bbb" }}>Powered by WheatPix</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
