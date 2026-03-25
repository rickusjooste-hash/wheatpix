// Force dynamic rendering — this page requires auth and Supabase client
export const dynamic = "force-dynamic";

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
