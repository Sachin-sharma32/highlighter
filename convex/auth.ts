import { convexAuth } from "@convex-dev/auth/server";
import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials";
import { createAccount, retrieveAccount } from "@convex-dev/auth/server";
import Google from "@auth/core/providers/google";

const DEV_JWT_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCwZIwGnPjzgjoi
SwNdhx8M4sI/bAFJ4RbIqgZStf7qhSAwkpD7WguosurWrIDmeiF952IeOU9yUezF
2zhDt5B/51VDzyQATJOeTSj2F+GapzDmRAT6Ua/nzU/6aAReT9w4misFKqhjd2ZG
crFXLsn0QsAuHDglVgoZqEF5RwqzJVUAhsNpF/Q6kNsy6kauHtlf2MvAJgo8JZYS
0XaaSJ2V63d/Suz9M3TIEoj1xlTCqvFlEORwVbHOUwV3wnLzxtnXzmA8meESVOta
WWLqqdkUw/KibDKZ9PHwy7OIgSnGmrK8KegewsChehZBCncVq0EGh+XXqi0U0kC1
MjuNbnatAgMBAAECggEAAhrkZQyjeJIJkaRMPUnggq418pSFYCXCzlipMkp+uitL
mCIqkhAR5xYQsqNHFnqbf6QK4krw972ZHEVEHiDpf86gijI/NzEpZIMzMiYccgBk
Obi59rmrDtQvY0qlDbnDZywC2pEdIrkWVj2+YMJ5vA3v7O1WPMfUJBPUj508gxlX
Ia5zsjcXAuR1vtVcdfayxqVrQnUjLc+w9HTPH5ico0Rd9BsTKCl7SmUcgZAHYnzJ
VrZf2ZTVfYqSQwBStPzvtX4Zzsmfwnr15cljtjh0YYtw8wY4LbehaaEpS0GHuAmj
B72aknNxf2E9Web1HdyEgavAW2AuPh/w16yJwPtfBwKBgQDgMSGOb9OqNDYAkYwO
UHNqS3fu4n0Hs3AQjmxolrVMxNsLpjO39XRpgschLWGdbXHGuILlf2U1YvfG71EG
FlOXa75BaC+blcy7Z5fnK1Tt3X8cWHghL89OgZwD3jvam8Xq2vPS6cz4oCvJ3X2Y
gfTOdRjqvA7gsXASvRFdFxoBhwKBgQDJa03PywuEUEE31BRmrNQ27WMwV0PoP9zv
szsXgFfOf8qeNEy/7pG0rdp5/ew3QPQKFAF6vAJTTT4lNbUKWgpRIoWufea5rL1U
Myjnq8ghTLsIjT8GlPbz6/iAgJQ90Cm0vmI4dawrzsThVC5T5o1wqIJLrcAnrB7E
MwyTKP9jKwKBgHitWZ+/SBNNKWhi8B3gZk/oMbWvypdzmjX/RBGEVjDtoe8CVsKF
6FTHJYMRV4MTH3RVa3g3e/YhwLgfp+B78iEGyRGSEFZSazLRT24K4Btt5/cNFBTh
FFjw4Vcfr947jWye0TJN0ZxfM1Lk269U/L6JP5FTCzsdp/MePJN8VO5PAoGBAIQT
8CdlTv0Jn2qbkHEvvczy54sIfkgqsJciIYqsp2eK1vPc+cMWDse7BTvfrWkiF6UQ
L1QrOx8i1LCTwk6ycnd3us+MUaLJyjEPhzA7rfVgGnlmHcEUJ8gVoZOqPQs3mFGk
UkYRq7/iS6oyiFqOIYuRhDdaDVo2fMpNa16IkMeXAoGAIsGmLQYUjhOwbEawNjE9
ZemR7qyXhGPiIZ4ux8YrjgLokLedOG32BRJGPAJ7PLoD5LeCsOm2bm4fwbgN7Ngt
djxPAiBznYPGkybWI2L46qw9DZt5WZYvgBehOfugQGWTmGXZg939sW3xGXu50Vt7
ZxWN7yenx0f0F91+3OVPXqA=
-----END PRIVATE KEY-----`;

const isProduction =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.NODE_ENV ===
  "production";

const runtimeEnv =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;

if (!isProduction && runtimeEnv) {
  if (!runtimeEnv.JWT_PRIVATE_KEY) {
    runtimeEnv.JWT_PRIVATE_KEY = DEV_JWT_PRIVATE_KEY;
  }
  if (!runtimeEnv.CONVEX_SITE_URL) {
    runtimeEnv.CONVEX_SITE_URL = "http://127.0.0.1:3210";
  }
}

const enableLocalCredentials =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
    ?.AUTH_ENABLE_PLAYWRIGHT === "1";

const testProvider = !isProduction || enableLocalCredentials
  ? ConvexCredentials({
      id: "playwright",
      authorize: async (credentials, ctx) => {
        const email = String(credentials.email ?? "").trim().toLowerCase();
        if (!email) {
          throw new Error("Missing email");
        }

        let existing: Awaited<ReturnType<typeof retrieveAccount>> | null = null;
        try {
          existing = await retrieveAccount(ctx, {
            provider: "playwright",
            account: { id: email },
          });
        } catch (error) {
          if (!(error instanceof Error) || error.message !== "InvalidAccountId") {
            throw error;
          }
        }

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
