"use client";

import { createAuthClient } from "better-auth/react";
import { emailOTPClient, adminClient, inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "@/lib/auth";

export const authClient = createAuthClient({
  plugins: [
    emailOTPClient(),
    adminClient(),
    inferAdditionalFields<typeof auth>(),
  ],
});

export const { useSession, signOut } = authClient;
