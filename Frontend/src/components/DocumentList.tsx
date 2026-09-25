import { useEffect, useState } from "react";
import { useAuth } from "react-oidc-context";

type Doc = {
  id: string;
  fileName: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  s3Key: string;
  createdAt: string;
};

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${Math.round((bytes / 1024 / 1024) * 100) / 100} MB`;
}

export default function DocumentList({ refreshKey }: { refreshKey?: number }) {
  const auth = useAuth();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!auth.user?.access_token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("http://localhost:5001/api/documents?page=1&limit=1000", {
        headers: {
          Authorization: `Bearer ${auth.user.access_token}`,
          "x-id-token": auth.user?.id_token || "",
        },
      });
      if (!res.ok) throw new Error(`Failed to load: ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.docs || [];
      setDocs(list || []);
      // fetch previews for image files
      try {
        const imageDocs = (list || []).filter((x: Doc) => x.mimeType?.startsWith("image/"));
        const previewMap: Record<string, string> = {};
        await Promise.all(
          imageDocs.map(async (doc: Doc) => {
            try {
              const url = await fetchDownloadUrl(doc.id);
              if (url) previewMap[doc.id] = url;
            } catch (e) {
              // ignore
            }
          })
        );
        setPreviews(previewMap);
      } catch (e) {
        // ignore
      }
    } catch (err: any) {
      setError(err?.message || "Unable to load documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.user, refreshKey]);

  const fetchDownloadUrl = async (id: string) => {
    const res = await fetch(`http://localhost:5001/api/documents/${id}`, {
      headers: {
        Authorization: `Bearer ${auth.user?.access_token}`,
        "x-id-token": auth.user?.id_token || "",
      },
    });
    if (!res.ok) throw new Error(`Failed to get download URL: ${res.status}`);
    const data = await res.json();
    return data.downloadUrl as string | undefined;
  };

  const download = async (id: string) => {
    try {
      const url = await fetchDownloadUrl(id);
      if (url) window.open(url, "_blank");
      else throw new Error("No download URL returned");
    } catch (err: any) {
      alert(err?.message || "Download failed");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this document?")) return;
    try {
      const res = await fetch(`http://localhost:5001/api/documents/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${auth.user?.access_token}`,
          "x-id-token": auth.user?.id_token || "",
        },
      });
      if (!res.ok) throw new Error(`Failed to delete: ${res.status}`);
      await load();
    } catch (err: any) {
      alert(err?.message || "Delete failed");
    }
  };

  if (loading) return <div>Loading documents...</div>;
  if (error) return <div style={{ color: "red" }}>{error}</div>;

  if (!docs.length) return <div>No documents yet.</div>;

  return (
    <div className="doc-grid">
      {docs.map((d) => (
        <div key={d.id} className="doc-card">
          <div className="doc-thumb" onClick={() => download(d.id)}>
            {d.mimeType.startsWith("image/") ? (
              <img src={previews[d.id] || ""} data-docid={d.id} alt={d.originalFileName} className="doc-img" />
            ) : (
              <div className="doc-icon">{d.originalFileName.split('.').pop()?.toUpperCase() || 'FILE'}</div>
            )}
          </div>
          <div className="doc-meta">
            <div className="doc-title">{d.originalFileName}</div>
            <div className="doc-sub">{new Date(d.createdAt).toLocaleString()}</div>
            <div className="doc-sub">{fmtSize(d.fileSize)} • {d.mimeType}</div>
          </div>
          <div className="doc-actions">
            <button onClick={() => download(d.id)} className="btn">Open</button>
            <button onClick={() => remove(d.id)} className="btn-outline">Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}
