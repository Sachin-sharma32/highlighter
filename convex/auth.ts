import { convexAuth } from "@convex-dev/auth/server";
import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials";
import { createAccount, retrieveAccount } from "@convex-dev/auth/server";
import Google from "@auth/core/providers/google";

const DEV_JWT_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDQiCvs4hSt4arh
CNANrCvyOUA/Nfuo0f15iJQLca7kvQokbGi+x+YEo1U+WYtT8TyIBqgeq7HdAaVI
nq7qbUezWn999au6YDHcaEsx3zy1dgLZI4+fFGjGGI4zBHEvzjTL1qnwGGtNh7NC
W/VLSiAAssr1FqNtT83/IUE14P08VTMyfP/yHmA0h0sE+IWoEnBN5zoL5Cryf+Bb
wgKq1cyOkf/l1nZCc2kuQRPu7OugOQtuX5586rJdVsmPQBKHSMuLAVSr3WXOqRER
JXSufTJvJr+63LS3mFSfcF2NsFoVbA59aupYLpkGAs2Kbq9/3xOhn9NibS6JhRzb
4/3PzFF9AgMBAAECggEAC7lEIu648+emiD1LGSGvXNBcLNGXou+fXQhRLm2HRCPe
oJqZrvQlGeim37kADMmYuhsJs6O6fa7cgH8vXU2khNBXL5kyvOkwlHAmnhirXJZU
ZanKpspqc4yo3fRneqUQsc8RQcbVrYeuC9KIsWFq+C8VGv9ZU8lzTt8rP+C0zAHy
NqdOwAOqB8dIDdf25/WlLKs336ivngLU9sMb0ezwvjEM55l1un3mSqTyXDXi11zE
j2WaOcysvK0M+EsJMtr2EQ43pVXSPVrtX55lwwc6y6+QiDmO8g/qISHoxGuagqHE
qGoOVhf39qRTpWcANUfpVpQuoz2K39zWqlrxQqXabwKBgQD1UcSf/NGgeeisV3RX
60MsCzB2E8tRFaHW9NR8H1dTfx7Sm7U2mPpSwCs3SsYQZwwdZT5pXrNlWbnK48fN
3b9+c0Iwr0Pe/Pd9dv/T9Ni8JcBPZbbXCEcm0BpfDIHSkyCza17YnpYJE1hKHb18
F9mCfGSn8w4/m+r6Iq3u890ewwKBgQDZnGKJ5uN7tjh+2N7nC/GvTs+aC9ws8ox3
+S3BHUe+2BaoQluFE32wOLU/0DhK03vLmMTTMUKxbGd8IJQPlj6Unxvzw4Yi7dJS
FD1dF18z1bDEfOJjh7kbrBtTNn/cXNwh6Qn3qNR8LFCENSrRfTR1Nw0ooGBrTevy
Wgzq7npKvwKBgFrBHkGlsRNyJi6jx+nCoj4IAaydFAlyPEYemwE0QwUjsQ5vBjIl
k+3LI/G3muB0jtnNG7K1kx56fC5f6Anz8CTilOkX3b7/zLtAq9II8alhOezljyer
606jjC3/nYN+ZImbviHbQVwoKPB6YiAnXpNUW5R6aZoEn4BcFgahdvsrAoGAPRvx
gBBaqY8OZnC4h+GOyVA0dGoINocWc0qCUszKLQm5sx6PXNuQXEBQhc8PP9QL26zW
+QfIVtK+bNkpOwdSI6Ja0yWBMaXffjU41j+N+Jx1u3fmi1S94st+EOwpE9Tv7IXo
yqeapBQ9uCLGF3Y1mQUQqOwAp6GGNNSc9AxsQzkCgYEAx+htQdtMSVFlFRHjs0b6
IW1bcIu2qCp83wa9IUQjJK7lHrHv3aZmQCLf1HkDzdKeo8gyrLLepITqvBRX3Fk5
AgneyPKY7Lfq3q4SmKnbdVXjQrxNhQs9JRUI2W8sTB3HQj+OhQV8N1tmU+elQlCW
N/rbdniFhhFdJaG6W0kbMjE=
-----END PRIVATE KEY-----`;

const isProduction =
  (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process?.env?.NODE_ENV === "production";

const runtimeEnv = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env;

if (!isProduction && runtimeEnv) {
  if (!runtimeEnv.JWT_PRIVATE_KEY) {
    runtimeEnv.JWT_PRIVATE_KEY = DEV_JWT_PRIVATE_KEY;
  }
  if (!runtimeEnv.CONVEX_SITE_URL) {
    runtimeEnv.CONVEX_SITE_URL = "http://127.0.0.1:3210";
  }
}

const enableLocalCredentials =
  (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process?.env?.AUTH_ENABLE_PLAYWRIGHT === "1";

const testProvider =
  !isProduction || enableLocalCredentials
    ? ConvexCredentials({
        id: "playwright",
        authorize: async (credentials, ctx) => {
          const email = String(credentials.email ?? "")
            .trim()
            .toLowerCase();
          if (!email) {
            throw new Error("Missing email");
          }

          let existing: Awaited<ReturnType<typeof retrieveAccount>> | null =
            null;
          try {
            existing = await retrieveAccount(ctx, {
              provider: "playwright",
              account: { id: email },
            });
          } catch (error) {
            if (
              !(error instanceof Error) ||
              error.message !== "InvalidAccountId"
            ) {
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
            },
          });
          return { userId: user._id };
        },
      })
    : undefined;

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Google, testProvider].filter(Boolean) as [typeof Google],
});
