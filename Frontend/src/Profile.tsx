import { useEffect, useState } from "react";
import { useAuth } from "react-oidc-context";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.isAuthenticated) {
      navigate("/");
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch("http://localhost:5001/api/user/profile", {
          headers: {
            Authorization: `Bearer ${auth.user?.access_token}`,
            "x-id-token": auth.user?.id_token || "",
          },
        });
        if (!res.ok) {
          setMessage(`Failed to load profile: ${res.status}`);
          return;
        }
        const data = await res.json();
        setName(data.name || "");
      } catch (err) {
        setMessage(String(err));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [auth.isAuthenticated, navigate, auth.user]);

  const save = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://localhost:5001/api/user/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.user?.access_token}`,
          "x-id-token": auth.user?.id_token || "",
        },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        setMessage(`Failed to save: ${res.status}`);
        return;
      }
      const data = await res.json();
      setMessage("Profile updated");
      setName(data.name || "");
    } catch (err) {
      setMessage(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Your Profile</h1>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div style={{ maxWidth: 420 }}>
          <label style={{ display: "block", marginBottom: 8 }}>
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ width: "100%", padding: 8, marginTop: 6 }}
            />
          </label>

          <div style={{ marginTop: 12 }}>
            <button onClick={save}>Save</button>
            <button style={{ marginLeft: 8 }} onClick={() => navigate("/")}>Back</button>
          </div>

          {message && <div style={{ marginTop: 12 }}>{message}</div>}
        </div>
      )}
    </div>
  );
}
