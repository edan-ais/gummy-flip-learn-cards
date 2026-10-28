import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

// The hosted build may expose public Cloud configuration only through Vite.
// Fill only missing public values; never replace runtime/draft bindings or expose secrets.
const cloudConfiguration = createMiddleware({ type: "function" }).server(async ({ next }) => {
  process.env["SUPABASE_URL"] ??= import.meta.env.VITE_SUPABASE_URL;
  process.env["SUPABASE_PUBLISHABLE_KEY"] ??= import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  return next();
});

export const startInstance = createStart(() => ({
  functionMiddleware: [cloudConfiguration, attachSupabaseAuth],
  requestMiddleware: [errorMiddleware, csrfMiddleware],
}));
