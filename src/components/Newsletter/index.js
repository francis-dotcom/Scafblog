import React, { useState } from "react";
import styles from "./styles.module.css";

export default function Newsletter({
  title = "📧 Subscribe to Our Newsletter",
  description = "Get the latest posts delivered to your inbox",
  buttonText = "Subscribe",
  theme = "primary",
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setStatus("error");
      return;
    }

    setLoading(true);
    setStatus("");

    try {
      const response = await fetch("/.netlify/functions/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus("success");
        setEmail("");
      } else {
        setStatus("error");
        console.error("Subscription error:", data.message);
      }
    } catch (error) {
      setStatus("error");
      console.error("Network error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${styles.newsletter} ${styles[theme]}`}>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.description}>{description}</p>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.inputGroup}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email address"
            required
            className={styles.input}
            disabled={loading}
          />
          <button
            type="submit"
            className={styles.button}
            disabled={loading || !email}
          >
            {loading ? "⏳ Subscribing..." : `✨ ${buttonText}`}
          </button>
        </div>
      </form>

      {status === "success" && (
        <div className={styles.success}>
          🎉 Successfully subscribed! Welcome to our newsletter!
        </div>
      )}

      {status === "error" && (
        <div className={styles.error}>
          ❌ Something went wrong. Please try again.
        </div>
      )}
    </div>
  );
}
