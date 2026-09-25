import { useMemo } from "react";
import { useAuth } from "react-oidc-context";
import ThreeScene from "./ThreeScene";

function App() {
  const auth = useAuth();

  const userInfo = useMemo(() => {
    if (!auth.user) return null;
    const profile = (auth.user as any).profile || {};
    return {
      email: profile.email || "Unknown",
      idToken: auth.user.id_token,
      accessToken: auth.user.access_token,
      refreshToken: (auth.user as any).refresh_token,
    };
  }, [auth.user]);

  if (auth.isLoading) return <div>Loading...</div>;

  if (auth.error) return <div>Encountering error... {auth.error.message}</div>;

  const handleSignOut = async () => {
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
      console.error("Logout failed", err);
      window.location.assign(logoutUri);
    }
  };

  if (!auth.isAuthenticated) {
    return (
      <div className="auth-hero">
        <div className="auth-hero-card">
          <div className="auth-hero-content">
            <span className="hero-badge">SphereAI</span>
            <h1>Your secure AI document vault.</h1>
            <p className="hero-copy">
              Keep personal records, receipts, and trusted documents protected with secure Cognito login, encrypted storage, and fast metadata search.
            </p>
            <div className="hero-features auth-features">
              <span>Secure login</span>
              <span>Encrypted storage</span>
              <span>Smart search</span>
            </div>
            <button className="btn animated-btn" onClick={() => auth.signinRedirect()}>Get Started With SphereAI</button>
            <p className="auth-subtext">Powered by AWS Cognito for a safe, trusted sign-in experience.</p>
          </div>
          <div className="auth-hero-visual">
            <ThreeScene />
            <p className="hero-visual-copy">A live SphereAI lens for secure documents and instant retrieval.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-shell">
      <div className="dashboard-header">
        <div>
          <span className="dashboard-flag">SphereAI</span>
          <h1>Welcome back, agent.</h1>
          <p>Secure workspace with terminal-style insights, live globe status, and smart document intelligence.</p>
        </div>
        <button className="btn btn-ghost" onClick={handleSignOut}>Sign out</button>
      </div>
      <div className="dashboard-grid">
        <section className="dashboard-card dashboard-terminal-card">
          <div className="terminal-header">
            <span className="terminal-dot red" />
            <span className="terminal-dot yellow" />
            <span className="terminal-dot green" />
            <strong>SphereAI shell</strong>
          </div>
          <div className="terminal-body">
            <div className="terminal-line"><span>$ auth.status</span><span>✓ secure</span></div>
            <div className="terminal-line"><span>$ sync.documents</span><span>4,210 files</span></div>
            <div className="terminal-line"><span>$ index.health</span><span>good</span></div>
            <div className="terminal-line"><span>$ vectorize.new</span><span>256 tokens</span></div>
            <div className="terminal-line terminal-fade"><span>Artifact monitor online, scanning changes...</span></div>
          </div>
          <div className="terminal-footer">
            <span className="terminal-label">Latest commit:</span>
            <span className="terminal-chip">audit-2026.07.22</span>
          </div>
        </section>

        <div className="dashboard-right-column">
          <section className="dashboard-card dashboard-globe-card">
            <div className="globe-panel">
              <div className="globe-ring" />
              <div className="globe-core" />
              <div className="globe-accent" />
              <div className="globe-dot globe-dot-1" />
              <div className="globe-dot globe-dot-2" />
              <div className="globe-dot globe-dot-3" />
            </div>
            <div className="globe-copy">
              <h2>Global document security</h2>
              <p>Encrypted access across your workspace with AI audit trails and live protection coverage.</p>
            </div>
          </section>

          <section className="dashboard-card dashboard-stats-card">
            <div className="stat-pill"><strong>Active sessions</strong><span>3</span></div>
            <div className="stat-pill"><strong>Documents scanned</strong><span>4.2K</span></div>
            <div className="stat-pill"><strong>Threat score</strong><span>Low</span></div>
            <div className="stat-pill"><strong>Latest scan</strong><span>2m ago</span></div>
          </section>
        </div>
      </div>

      <div className="dashboard-secondary-grid">
        <section className="dashboard-card docs-card">
          <div className="docs-header">
            <div>
              <h2>Recent documents</h2>
              <p>Latest files indexed and shared across your vault.</p>
            </div>
            <span>Updated</span>
          </div>
          <ul className="doc-list">
            <li><span>ClientContract.pdf</span><strong>3m ago</strong></li>
            <li><span>QuarterlyReport.xlsx</span><strong>12m ago</strong></li>
            <li><span>ResearchNotes.md</span><strong>28m ago</strong></li>
            <li><span>PolicySnapshot.docx</span><strong>45m ago</strong></li>
          </ul>
        </section>

        <section className="dashboard-card action-card">
          <h2>Terminal activity</h2>
          <div className="action-grid">
            <div>
              <p className="action-label">AI index</p>
              <strong>Uploading 18 files</strong>
            </div>
            <div>
              <p className="action-label">Security</p>
              <strong>Monitoring live threats</strong>
            </div>
            <div>
              <p className="action-label">Sync</p>
              <strong>All locations synced</strong>
            </div>
          </div>
        </section>
      </div>
      {userInfo && (
        <div className="dashboard-meta">
          <span>Email: {userInfo.email}</span>
          <span>Access token: {userInfo.accessToken?.slice(0, 12)}...</span>
        </div>
      )}
    </div>
  );
}

export default App;
