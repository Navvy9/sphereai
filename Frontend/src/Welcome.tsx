import { useNavigate } from "react-router-dom";
import { useAuth } from "react-oidc-context";

export default function Welcome() {
  const auth = useAuth();
  const navigate = useNavigate();

  return (
    <div style={{ padding: 40, maxWidth: 640 }}>
      <h1>Welcome, {auth.user?.profile.name || "SphereAI User"}!</h1>
      <p>Your secure AI document vault is ready.</p>
      <p style={{ marginTop: 24 }}>
        Upload your first document to begin using SphereAI’s intelligent document assistant.
      </p>
      <button
        onClick={() => navigate("/dashboard")}
        style={{ marginTop: 24, padding: "12px 20px" }}
      >
        Get Started
      </button>
    </div>
  );
}
