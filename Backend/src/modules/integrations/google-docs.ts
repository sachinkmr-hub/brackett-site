const GOOGLE_DOC_HOSTS = new Set([
  'docs.google.com',
  'www.docs.google.com',
]);

const GOOGLE_DRIVE_EXPORT_BASE = 'https://www.googleapis.com/drive/v3/files';

const trimText = (value: string) => value.replace(/\s+/g, ' ').trim();

export const parseGoogleDocId = (rawUrl: string) => {
  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('Google document URL is invalid');
  }

  if (!GOOGLE_DOC_HOSTS.has(url.hostname)) {
    throw new Error('Use a Google Docs document URL for Google capture');
  }

  const match = url.pathname.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (!match?.[1]) {
    throw new Error('Google document URL is missing a document id');
  }

  return match[1];
};

const readResponseText = async (response: Response) => {
  const text = await response.text();
  return trimText(text);
};

export const fetchGoogleDocText = async (rawUrl: string, accessToken?: string | null) => {
  const documentId = parseGoogleDocId(rawUrl);

  if (accessToken) {
    const response = await fetch(
      `${GOOGLE_DRIVE_EXPORT_BASE}/${documentId}/export?mimeType=text/plain`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (response.ok) {
      const text = await readResponseText(response);
      if (text) {
        return text;
      }
    }

    if (![401, 403, 404].includes(response.status)) {
      throw new Error('Google document export failed');
    }
  }

  const publicResponse = await fetch(`https://docs.google.com/document/d/${documentId}/export?format=txt`);
  if (!publicResponse.ok) {
    throw new Error(
      'Google document access needs a Drive-scoped OAuth token or a publicly accessible document'
    );
  }

  const publicText = await readResponseText(publicResponse);
  if (!publicText) {
    throw new Error('Google document did not return readable text');
  }

  return publicText;
};
