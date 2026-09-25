import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "react-oidc-context";

export default function AuthCallback() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (auth.isLoading) {
      return;
    }

    if (auth.error) {
      setError(auth.error.message || "Unable to complete sign-in");
      navigate("/", { replace: true });
      return;
    }

    if (!auth.isAuthenticated || !auth.user?.access_token) {
      navigate("/", { replace: true });
      return;
    }

    const checkProfile = async () => {
      try {
        const user = auth.user;
        if (!user?.access_token) {
          throw new Error("No access token available after sign-in");
        }

        const res = await fetch("http://localhost:5001/api/user/profile", {
          headers: {
            Authorization: `Bearer ${user.access_token}`,
            "x-id-token": user?.id_token || "",
          },
        });

        if (!res.ok) {
          throw new Error(`Profile check failed: ${res.status}`);
        }

        const data = await res.json();
        navigate(data.name ? "/dashboard" : "/complete-profile", { replace: true });
      } catch (err: any) {
        console.error(err);
        setError(err?.message || "Unable to verify profile");
        navigate("/", { replace: true });
      }
    };

    checkProfile();
  }, [auth.error, auth.isAuthenticated, auth.isLoading, auth.user, navigate]);

  if (error) return <div>{error}</div>;
  return <h2>Signing you in...</h2>;
}
