import { useEffect, useMemo, useState } from "react";
import { useAuth } from "react-oidc-context";
import { useNavigate } from "react-router-dom";
import UploadForm from "./components/UploadForm";
import DocumentList from "./components/DocumentList";

export default function Dashboard() {
  const auth = useAuth();
  const navigate = useNavigate();
  // Dev-only: log auth state to help diagnose 401 profile errors
  // Remove this in production
  // eslint-disable-next-line no-console
  console.log("Auth state:", { isLoading: auth.isLoading, isAuthenticated: auth.isAuthenticated, user: auth.user });
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [docsCount, setDocsCount] = useState<number | null>(null);
  const [storageMb, setStorageMb] = useState<number | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (!auth.user?.access_token) {
        return;
      }

      try {
        const res = await fetch("http://localhost:5001/api/user/profile", {
          headers: {
            Authorization: `Bearer ${auth.user.access_token}`,
            "x-id-token": auth.user?.id_token || "",
          },
        });

        if (!res.ok) {
          throw new Error(`Failed to load profile: ${res.status}`);
        }

        const data = await res.json();
        setName(data.name || null);
        if (!data.name) {
          navigate("/complete-profile");
        }
      } catch (err: any) {
        setError(err?.message || "Unable to load profile");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [auth.user, auth.isLoading, navigate]);

  useEffect(() => {
    const loadStats = async () => {
      if (!auth.user?.access_token) return;
      try {
        const res = await fetch("http://localhost:5001/api/documents?page=1&limit=1000", {
          headers: {
            Authorization: `Bearer ${auth.user.access_token}`,
            "x-id-token": auth.user?.id_token || "",
          },
        });
        if (!res.ok) return;
        const data = await res.json();
        const docs = Array.isArray(data) ? data : data.docs || [];
        setDocsCount(docs.length);
        const totalBytes = docs.reduce((s: number, d: any) => s + (d.fileSize || 0), 0);
        setStorageMb(Math.round((totalBytes / 1024 / 1024) * 100) / 100);
      } catch (e) {
        // ignore
      }
    };

    loadStats();
  }, [auth.user, refreshKey]);

  const userBadge = useMemo(() => {
    if (!name) return "Vault Manager";
    return name.split(" ")[0];
  }, [name]);

  if (auth.isLoading || loading) return <div className="dashboard-loading">Loading dashboard...</div>;
  if (error) return <div className="dashboard-error">{error}</div>;

  const handleLogout = async () => {
    await auth.removeUser?.();

    const authority = import.meta.env.VITE_COGNITO_AUTHORITY;
    const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID;
    const logoutUri = import.meta.env.VITE_COGNITO_POST_LOGOUT_REDIRECT_URI;

    try {
      const configRes = await fetch(`${authority}/.well-known/openid-configuration`);
      if (!configRes.ok) {
        throw new Error(`Unable to load OIDC config: ${configRes.status}`);
      }
      const config = await configRes.json();
      const logoutUrl = new URL(config.end_session_endpoint);
      logoutUrl.searchParams.set("client_id", clientId);
      logoutUrl.searchParams.set("logout_uri", logoutUri);
      window.location.assign(logoutUrl.toString());
    } catch (err) {
      console.warn("Logout redirect failed, clearing local session", err);
      navigate("/");
    }
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <span className="eyebrow">SphereAI Control Center</span>
          <h1>Command your document intelligence workflow.</h1>
        </div>
        <button className="btn btn-ghost logout-btn" onClick={handleLogout}>Logout</button>
      </div>

      <header className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <p>
            Review secure files, monitor storage usage, and batch operations from a clean, terminal-inspired interface designed for modern productivity.
          </p>
          <div className="dashboard-hero-actions">
            <button className="btn">Upload document</button>
            <button className="btn-outline" onClick={() => setRefreshKey((k) => k + 1)}>Refresh view</button>
          </div>
        </div>

        <div className="dashboard-terminal-card">
          <div className="terminal-header">
            <span className="terminal-dot red" />
            <span className="terminal-dot yellow" />
            <span className="terminal-dot green" />
          </div>
          <div className="terminal-body">
            <div className="terminal-line">{'>'} welcome {userBadge}</div>
            <div className="terminal-line">{'>'} documents: <strong>{docsCount ?? 0}</strong></div>
            <div className="terminal-line">{'>'} storage: <strong>{storageMb ?? 0} MB</strong></div>
            <div className="terminal-line terminal-fade">{'>'} last sync completed successfully.</div>
          </div>
        </div>
      </header>

      <section className="dashboard-main">
        <div className="card pulse-card">
          <div className="card-header">
            <h2>Upload a document</h2>
            <span className="status-pill">AI-ready</span>
          </div>
          <p className="card-text">Drop files, add metadata, and let SphereAI index your content instantly.</p>
          <UploadForm onUploaded={() => setRefreshKey((k) => k + 1)} />
        </div>

        <div className="card" style={{ marginTop: 24 }}>
          <h2>Your Documents</h2>
          <DocumentList refreshKey={refreshKey} />
        </div>
      </section>
    </div>
  );
}
