const MARGINALIA_HASH_KEY = "marginalia";

function splitHash(hash: string) {
  const body = hash.startsWith("#") ? hash.slice(1) : hash;
  return body ? body.split("&") : [];
}

function stripMarginaliaFromHash(hash: string) {
  const parts = splitHash(hash).filter((part) => {
    const [rawKey] = part.split("=");
    try {
      return decodeURIComponent(rawKey) !== MARGINALIA_HASH_KEY;
    } catch {
      return rawKey !== MARGINALIA_HASH_KEY;
    }
  });
  return parts.length ? `#${parts.join("&")}` : "";
}

export function stripMarginaliaTarget(urlString: string) {
  if (!urlString) return urlString;

  try {
    const url = new URL(urlString);
    url.hash = stripMarginaliaFromHash(url.hash);
    return url.toString();
  } catch {
    const hashIndex = urlString.indexOf("#");
    if (hashIndex === -1) return urlString;
    const base = urlString.slice(0, hashIndex);
    const hash = stripMarginaliaFromHash(urlString.slice(hashIndex));
    return `${base}${hash}`;
  }
}

export function readMarginaliaTarget(urlString: string) {
  try {
    const url = new URL(urlString);
    for (const part of splitHash(url.hash)) {
      const [rawKey, rawValue = ""] = part.split("=");
      if (decodeURIComponent(rawKey) === MARGINALIA_HASH_KEY) {
        return decodeURIComponent(rawValue);
      }
    }
  } catch {
    const hashIndex = urlString.indexOf("#");
    if (hashIndex === -1) return null;
    for (const part of splitHash(urlString.slice(hashIndex))) {
      const [rawKey, rawValue = ""] = part.split("=");
      if (rawKey === MARGINALIA_HASH_KEY) {
        return decodeURIComponent(rawValue);
      }
    }
  }

  return null;
}

export function withMarginaliaTarget(urlString: string, highlightId: string) {
  const cleanUrl = stripMarginaliaTarget(urlString);
  const encodedId = encodeURIComponent(highlightId);

  try {
    const url = new URL(cleanUrl);
    const currentHash = stripMarginaliaFromHash(url.hash);
    const hashParts = splitHash(currentHash);
    hashParts.push(`${MARGINALIA_HASH_KEY}=${encodedId}`);
    url.hash = hashParts.join("&");
    return url.toString();
  } catch {
    const hashIndex = cleanUrl.indexOf("#");
    if (hashIndex === -1) return `${cleanUrl}#${MARGINALIA_HASH_KEY}=${encodedId}`;

    const base = cleanUrl.slice(0, hashIndex);
    const hashParts = splitHash(cleanUrl.slice(hashIndex));
    hashParts.push(`${MARGINALIA_HASH_KEY}=${encodedId}`);
    return `${base}#${hashParts.join("&")}`;
  }
}
