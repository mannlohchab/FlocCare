import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchSite, watchSite } from "../lib/api";
import type { Site } from "../lib/types";

export default function SiteDetailPage() {
  const { id = "" } = useParams();
  const [site, setSite] = useState<Site | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stop = () => {};
    let poll: ReturnType<typeof setInterval> | undefined;

    fetchSite(id)
      .then((s) => {
        setSite(s);
        if (s.status === "ready" || s.status === "error") return;
        stop = watchSite(id, setSite);
        poll = setInterval(() => {
          fetchSite(id)
            .then((next) => {
              setSite(next);
              if (next.status === "ready" || next.status === "error") {
                if (poll) clearInterval(poll);
                stop();
              }
            })
            .catch(() => {});
        }, 2500);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Not found"));

    return () => {
      stop();
      if (poll) clearInterval(poll);
    };
  }, [id]);

  const progress = useMemo(() => {
    if (!site) return 0;
    const done = site.pages.filter(
      (p) => p.status === "ready" || p.status === "error",
    ).length;
    return Math.round((done / Math.max(site.pages.length, 1)) * 100);
  }, [site]);

  if (error) {
    return (
      <section className="hero">
        <h1>Missing site.</h1>
        <p>{error}</p>
        <Link to="/sites">Back to sites</Link>
      </section>
    );
  }

  if (!site) {
    return (
      <section className="hero">
        <h1>Loading…</h1>
      </section>
    );
  }

  return (
    <>
      <section className="hero">
        <h1>{site.companyName}</h1>
        <p>
          {site.status === "ready"
            ? "All pages are hosted. Open the journal or any individual post."
            : site.status === "error"
              ? site.error ?? "Generation failed."
              : "Writing long-form posts and publishing them with your brand."}
        </p>
      </section>

      <div className="panel">
        <div
          style={{
            display: "flex",
            gap: 16,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <img
            src={site.logoPath}
            alt=""
            style={{
              width: 64,
              height: 64,
              borderRadius: 14,
              objectFit: site.logoPath.endsWith(".svg") ? "contain" : "cover",
              background: "#f3f3f3",
              padding: site.logoPath.endsWith(".svg") ? 8 : 0,
              border: `2px solid ${site.brandColor}`,
            }}
          />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div className="brand-line">
              Brand
              <i style={{ background: site.brandColor }} />
              {site.brandColor}
              <span>Writer · {site.model}</span>
            </div>
            <div className="progress" aria-label="Generation progress">
              <i style={{ width: `${progress}%` }} />
            </div>
            <div style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
              {progress}% · {site.status}
            </div>
          </div>
          <div className="actions" style={{ marginTop: 0 }}>
            {site.status === "ready" && (
              <a
                className="btn btn-primary"
                href={`/s/${site.slug}/`}
                target="_blank"
                rel="noreferrer"
              >
                Open hosted site
              </a>
            )}
            <Link className="btn btn-ghost" to="/">
              New site
            </Link>
          </div>
        </div>

        {site.bannerPath && (
          <img
            src={site.bannerPath}
            alt=""
            style={{
              width: "100%",
              height: 160,
              objectFit: "cover",
              borderRadius: 16,
              marginTop: 18,
            }}
          />
        )}
        {site.notice && (
          <p className="error" style={{ color: "var(--warn)" }}>
            {site.notice}
          </p>
        )}

        <div className="page-rows">
          {site.pages.map((page) => (
            <div key={page.slug} className="page-row">
              <div>
                <div style={{ fontWeight: 650 }}>{page.topic}</div>
                <div style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
                  {page.status === "ready"
                    ? `${page.wordCount.toLocaleString()} words`
                    : page.error ?? page.status}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span className={`status ${page.status}`}>{page.status}</span>
                {page.status === "ready" && (
                  <a href={page.path} target="_blank" rel="noreferrer">
                    View
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
