"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      style={{
        background: "none",
        border: "1px solid #E2DED6",
        borderRadius: "8px",
        padding: "8px 16px",
        color: "#5C554B",
        fontSize: "13px",
        cursor: "pointer",
        fontFamily: "var(--font-outfit), 'Outfit', sans-serif",
      }}
    >
      Teken uit
    </button>
  );
}
