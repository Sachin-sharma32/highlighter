import { convexAuth } from "@convex-dev/auth/server";
import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials";
import { createAccount, retrieveAccount } from "@convex-dev/auth/server";
import Google from "@auth/core/providers/google";

const isProduction =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.NODE_ENV ===
  "production";

const testProvider = !isProduction
  ? ConvexCredentials({
      id: "playwright",
      authorize: async (credentials, ctx) => {
        const email = String(credentials.email ?? "").trim().toLowerCase();
        if (!email) {
          throw new Error("Missing email");
        }

        const existing = await retrieveAccount(ctx, {
          provider: "playwright",
          account: { id: email },
        });
        if (existing) {
          return { userId: existing.user._id };
        }

        const { user } = await createAccount(ctx, {
          provider: "playwright",
          account: { id: email },
          profile: {
            email,
            name: email.split("@")[0],
          } as any,
        });
        return { userId: user._id };
      },
    })
  : undefined;

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Google, testProvider].filter(Boolean) as [typeof Google],
});
