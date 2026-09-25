import { useState, useRef } from "react";
import { useAuth } from "react-oidc-context";

export default function UploadForm({ onUploaded }: { onUploaded?: () => void }) {
  const auth = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const pick = () => inputRef.current?.click();

  const onFile = (f: File | null) => {
    setMessage(null);
    setFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const first = e.dataTransfer.files?.[0] || null;
    onFile(first);
  };

  const upload = async () => {
    if (!file) return setMessage("No file selected");
    setLoading(true);
    try {
      // Ensure we have an access token before attempting upload
      if (!auth.user?.access_token) {
        setMessage("Missing access token — please sign in again.");
        // trigger sign-in flow to refresh token
        try {
          auth.signinRedirect();
        } catch (e) {
          // ignore if signinRedirect not available
        }
        return;
      }
      // In dev, use server-side proxy upload to avoid S3 CORS issues.
      if (import.meta.env.DEV) {
        const form = new FormData();
        form.append("file", file, file.name);

        const proxyRes = await fetch("http://localhost:5001/api/documents/proxy", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${auth.user?.access_token}`,
            "x-id-token": auth.user?.id_token || "",
          },
          body: form,
        });

        if (!proxyRes.ok) {
          const txt = await proxyRes.text().catch(() => "");
          // If token expired, prompt re-login
          if (proxyRes.status === 401) {
            setMessage(`Proxy upload failed: 401 ${txt} — please sign in again.`);
            try {
              auth.signinRedirect();
            } catch (e) {}
            return;
          }
          throw new Error(`Proxy upload failed: ${proxyRes.status} ${txt}`);
        }

        await proxyRes.json().catch(() => null);
      } else {
        // Production: use presigned upload flow
        const metaRes = await fetch("http://localhost:5001/api/documents/upload-url", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${auth.user?.access_token}`,
            "x-id-token": auth.user?.id_token || "",
          },
          body: JSON.stringify({
            originalFileName: file.name,
            mimeType: file.type || "application/octet-stream",
            fileSize: file.size,
          }),
        });

        if (!metaRes.ok) {
          const errText = await metaRes.text();
          throw new Error(`Upload URL generation failed: ${metaRes.status} ${errText}`);
        }

        const { uploadUrl, key } = await metaRes.json();

        const putRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": file.type || "application/octet-stream",
          },
          body: file,
        });

        if (!putRes.ok) {
          const txt = await putRes.text().catch(() => "");
          throw new Error(`S3 upload failed: ${putRes.status} ${txt}`);
        }

        // create metadata record for production flow
        const createRes = await fetch("http://localhost:5001/api/documents", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${auth.user?.access_token}`,
            "x-id-token": auth.user?.id_token || "",
          },
          body: JSON.stringify({
            s3Key: key,
            originalFileName: file.name,
            mimeType: file.type || "application/octet-stream",
            fileSize: file.size,
          }),
        });

        if (!createRes.ok) {
          const txt = await createRes.text();
          throw new Error(`Create metadata failed: ${createRes.status} ${txt}`);
        }
        await createRes.json().catch(() => null);
      }

      setMessage("Upload complete — document saved.");
      setFile(null);
      inputRef.current && (inputRef.current.value = "");
      // Notify parent to refresh the list. If the proxy returned a document,
      // the UI will reflect it after reload. Call `onUploaded` so `DocumentList` reloads.
      onUploaded && onUploaded();
    } catch (err: any) {
      console.error(err);
      setMessage(err?.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        style={{ padding: 20, border: "2px dashed #ccc", borderRadius: 8, textAlign: "center" }}
      >
        <input ref={inputRef} type="file" style={{ display: "none" }} onChange={(e) => onFile(e.target.files?.[0] || null)} />
        <div>
          {file ? <strong>{file.name}</strong> : <span>Drag & drop a file here, or</span>}
        </div>
        <button onClick={pick} style={{ marginTop: 12 }}>
          Choose file
        </button>
      </div>

      <div style={{ marginTop: 12 }}>
        <button onClick={upload} disabled={!file || loading}>
          {loading ? "Uploading…" : "Upload"}
        </button>
        {message && <div style={{ marginTop: 8 }}>{message}</div>}
      </div>
    </div>
  );
}
