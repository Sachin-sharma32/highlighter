declare const process: { env: Record<string, string | undefined> };

export default {
  providers: [
    {
      type: "customJwt" as const,
      issuer: process.env.CONVEX_SITE_URL!,
      jwks: process.env.CONVEX_SITE_URL! + "/.well-known/jwks.json",
      applicationID: "convex",
      algorithm: "RS256" as const,
    },
    {
      domain: "https://accounts.google.com",
      applicationID: "google",
    },
  ],
};
