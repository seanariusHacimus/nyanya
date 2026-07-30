"use client";

import { createAuthClient } from "better-auth/react";
import { adminClient, inferAdditionalFields } from "better-auth/client/plugins";
// import { emailOTPClient } from "better-auth/client/plugins";
import type { auth } from "@/lib/auth";

// ⛳ emailOTPClient отключён вместе с серверным плагином — см. lib/auth.ts
export const authClient = createAuthClient({
  plugins: [
    // emailOTPClient(),
    adminClient(),
    inferAdditionalFields<typeof auth>(),
  ],
});

export const { useSession, signOut } = authClient;
