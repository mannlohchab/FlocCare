import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchSites } from "../lib/api";
import type { Site } from "../lib/types";

export default function SitesPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSites()
      .then(setSites)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }, []);

  return (
    <>
      <section className="hero">
        <h1>Your ateliers.</h1>
        <p>
          Every run is a separate hosted brand journal. Reuse the portal for as
          many companies and campaigns as you need.
        </p>
      </section>

      {error && <p className="error">{error}</p>}

      <div className="site-list">
        {sites.length === 0 && !error ? (
          <div className="empty">
            No sites yet.{" "}
            <Link to="/" style={{ color: "var(--accent)" }}>
              Create one
            </Link>
            .
          </div>
        ) : (
          sites.map((site, i) => (
            <Link
              key={site.id}
              to={`/sites/${site.id}`}
              className="site-card"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <img
                src={site.logoPath}
                alt=""
                style={{
                  objectFit: site.logoPath.endsWith(".svg") ? "contain" : "cover",
                  background: "#f3f3f3",
                  padding: site.logoPath.endsWith(".svg") ? 6 : 0,
                }}
              />
              <div>
                <h3>{site.companyName}</h3>
                <p>
                  {site.pages.filter((p) => p.status === "ready").length}/
                  {site.pages.length} pages · {site.brandColor}
                </p>
              </div>
              <span className={`status ${site.status}`}>{site.status}</span>
            </Link>
          ))
        )}
      </div>
    </>
  );
}
