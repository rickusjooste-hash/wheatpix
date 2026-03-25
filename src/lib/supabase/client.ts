import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

// Proxy that defers all calls until the real client is available.
// During static prerendering, env vars don't exist — any method call
// returns a no-op promise so the component renders without error.
// On the client after hydration, the real Supabase client is used.
let _client: SupabaseClient | null = null;

export function createClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // Return a dummy object that won't throw during prerender
    return new Proxy({} as SupabaseClient, {
      get: (_target, prop) => {
        if (prop === "auth") {
          return new Proxy({}, {
            get: () => () => Promise.resolve({ data: { user: null, session: null, users: [] }, error: null }),
          });
        }
        // .from() returns a chainable query builder stub
        return () => new Proxy({}, {
          get: () => function chainable() {
            return new Proxy({}, { get: () => chainable });
          },
        });
      },
    });
  }

  if (!_client) {
    _client = createBrowserClient(url, key);
  }
  return _client;
}
