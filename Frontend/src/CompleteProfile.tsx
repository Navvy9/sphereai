import { useEffect, useState } from "react";
import { useAuth } from "react-oidc-context";
import { useNavigate } from "react-router-dom";

export default function CompleteProfile() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          throw new Error(`Failed to load profile: ${res.status}`);
        }
        const data = await res.json();
        if (data.name) {
          navigate("/dashboard");
          return;
        }
      } catch (err: any) {
        setError(err?.message || "Unable to load profile");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [auth, navigate]);

  const submit = async () => {
    if (!name.trim()) {
      setError("Full Name is required.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("http://localhost:5001/api/user/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.user?.access_token}`,
          "x-id-token": auth.user?.id_token || "",
        },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (!res.ok) {
        throw new Error(`Failed to save profile: ${res.status}`);
      }

      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      setError(err?.message || "Unable to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 40, maxWidth: 480 }}>
      <h1>Welcome to SphereAI!</h1>
      <p>Please complete your profile.</p>

      <label style={{ display: "block", marginTop: 24 }}>
        Full Name
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ width: "100%", padding: 10, marginTop: 8 }}
        />
      </label>

      {error && <div style={{ color: "red", marginTop: 12 }}>{error}</div>}

      <button
        onClick={submit}
        disabled={loading}
        style={{ marginTop: 24, padding: "10px 18px" }}
      >
        {loading ? "Saving…" : "Continue"}
      </button>
    </div>
  );
}
