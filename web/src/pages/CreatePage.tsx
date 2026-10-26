import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createSite, fetchHealth } from "../lib/api";
import { BANNERS, GLASS_ICONS } from "../lib/catalog";

const SAMPLE_TOPICS = [
  "Designing calm product interfaces",
  "Why brand colour systems matter",
  "Shipping small, shipping often",
  "Writing docs engineers actually read",
  "Remote rituals that keep teams aligned",
  "From sketch to production in a day",
  "Choosing type that carries personality",
  "Hosting stories, not just sites",
  "The craft of onboarding flows",
  "Measuring quality without vanity metrics",
];

export default function CreatePage() {
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState("");
  const [brandColor, setBrandColor] = useState("#3286FF");
  const [topicsText, setTopicsText] = useState(SAMPLE_TOPICS.join("\n"));
  const [logo, setLogo] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [iconId, setIconId] = useState(GLASS_ICONS[0].id);
  const [bannerId, setBannerId] = useState(BANNERS[0].id);
  const [mimoKey, setMimoKey] = useState("");
  const [model, setModel] = useState("…");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHealth().then((h) => setModel(h.model));
  }, []);

  const topics = useMemo(
    () =>
      topicsText
        .split("\n")
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 10),
    [topicsText],
  );

  const brandName = companyName.trim() || "Your brand";
  const leadTopic = topics[0] ?? "Designing calm product interfaces";
  const selectedIcon = GLASS_ICONS.find((icon) => icon.id === iconId) ?? GLASS_ICONS[0];
  const selectedBanner = BANNERS.find((banner) => banner.id === bannerId) ?? BANNERS[0];
  const SelectedIcon = selectedIcon.Icon;
  const leadPhrase = leadTopic.length > 42 ? leadTopic.split(" ").slice(0, 4).join(" ") : leadTopic;

  function onLogo(file: File | null) {
    setLogo(file);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(file ? URL.createObjectURL(file) : null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!companyName.trim()) {
      setError("Company name is required.");
      return;
    }
    if (topics.length < 1) {
      setError("Enter at least one topic (up to 10).");
      return;
    }
    setBusy(true);
    try {
      const site = await createSite({
        companyName: companyName.trim(),
        brandColor,
        topics,
        logo,
        iconId,
        bannerId,
        mimoKey: mimoKey.trim() || undefined,
      });
      navigate(`/sites/${site.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="k-hero">
        <h1>
          <span>Where a</span>
          <span>brand</span>
          <span>becomes</span>
          <span>a hosted</span>
          <span>journal.</span>
        </h1>
        <p>
          Pick a glass icon, a banner, and up to ten topics. Atelier writes the
          pages and hosts the site.
        </p>
        <div className="k-actions">
          <a className="btn btn-primary" href="#create">
            Generate pages
          </a>
          <Link className="btn btn-soft" to="/sites">
            View sites
          </Link>
        </div>
      </section>

      <section className="k-stage" aria-label="Website preview">
        <div className="k-frame">
          <div className="folio">
            <div className="folio-nav">
              <span className="folio-mark">
                {preview ? (
                  <img src={preview} alt="" />
                ) : (
                  <SelectedIcon size={22} uniqueId="preview-mark" aria-hidden />
                )}
              </span>
              <span className="folio-pills">
                <i>Work</i>
                <i>Notes</i>
                <i>About</i>
              </span>
              <b style={{ background: brandColor }}>{brandName.slice(0, 1).toUpperCase()}</b>
            </div>
            <img
              className="folio-banner"
              src={`/banners/${selectedBanner.file}`}
              alt=""
            />
            <p className="folio-hello">Hello, I'm {brandName}</p>
            <h2>
              I build <u>{leadPhrase.toLowerCase()}</u> and share what I learn.
            </h2>
            <ul className="folio-work">
              {(topics.length ? topics : SAMPLE_TOPICS).slice(0, 4).map((topic) => (
                <li key={topic}>
                  <b>{topic.split(" ").slice(0, 1).join(" ")}</b>
                  <span>{topic}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="k-center" id="how">
        <h2>A logo, a colour, ten topics.</h2>
        <p>
          Every team has that pile. A doc, a deck, a half-written blog — and
          still no site that sounds like the brand.
        </p>
        <div className="ask">
          <span>{leadTopic}</span>
          <a href="#create">Write</a>
        </div>
        <div className="chips">
          <span>{topics.length} essays</span>
          <span>{brandColor}</span>
          <span>Hosted when ready</span>
        </div>
      </section>

      <section className="k-library" id="journal">
        <div className="k-wrap">
          <h2>
            One brief
            <br />
            for the whole site.
          </h2>
          <div className="k-grid">
            <article>
              <div className="scene">
                <div className="scene-logo">
                  <span className="scene-icon">
                    {preview ? (
                      <img src={preview} alt="" />
                    ) : (
                      <SelectedIcon size={28} uniqueId="scene-mark" aria-hidden />
                    )}
                  </span>
                  <div>
                    <strong>{logo ? logo.name : selectedIcon.label}</strong>
                    <small>{logo ? "Custom mark" : "Glass icon"}</small>
                  </div>
                </div>
              </div>
              <h3>Logo</h3>
            </article>
            <article>
              <div className="scene">
                <div className="swatches">
                  {["#141414", "#9A9A9A", "#E7E7E7"].map((hex) => (
                    <i key={hex} style={{ background: hex }} />
                  ))}
                  <i className="on" style={{ background: brandColor }} />
                </div>
              </div>
              <h3>Colour</h3>
            </article>
            <article>
              <div className="scene">
                <ol className="topic-lines">
                  {topics.slice(0, 4).map((topic, i) => (
                    <li key={topic}>
                      <span>{i + 1}</span>
                      {topic}
                    </li>
                  ))}
                </ol>
              </div>
              <h3>Topics</h3>
            </article>
            <article>
              <div className="scene">
                <div className="prose-bars" aria-hidden>
                  <i style={{ width: "88%" }} />
                  <i style={{ width: "96%" }} />
                  <i style={{ width: "72%" }} />
                  <i style={{ width: "91%" }} />
                  <i style={{ width: "54%" }} />
                </div>
              </div>
              <h3>Writing</h3>
            </article>
            <article>
              <div className="scene">
                <div className="mini-page">
                  <div className="mini-top">
                    <b style={{ background: brandColor }} />
                    <i />
                    <i />
                  </div>
                  <strong />
                  <em />
                  <em />
                </div>
              </div>
              <h3>Layout</h3>
            </article>
            <article>
              <div className="scene">
                <div className="live-chip">
                  <i />
                  <span>/s/{brandName.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "journal"}</span>
                </div>
              </div>
              <h3>Hosting</h3>
            </article>
          </div>
        </div>
      </section>

      <section className="k-band">
        <div className="k-split">
          <h2>The pages stay on-brand when the draft is done.</h2>
          <div className="k-points">
            <div>
              <p>Layout</p>
              <h3>Every post shares the header, the type, and the colour.</h3>
            </div>
            <div>
              <p>Pages</p>
              <h3>A topic becomes a hosted page without leaving the portal.</h3>
            </div>
            <div>
              <p>Voice</p>
              <h3>The long read is written once, then published with the rest.</h3>
            </div>
          </div>
        </div>
        <figure className="k-quote">
          <blockquote>
            “We stopped pasting drafts into somewhere else. The brief, the
            essay, and the URL live in the same place.”
          </blockquote>
          <figcaption>Studio lead, Northwind</figcaption>
        </figure>
      </section>

      <section className="k-band k-band-follow" id="create">
        <form className="k-card" onSubmit={onSubmit}>
          <div className="k-card-copy">
            <h2>
              Ready to publish?
              <br />
              The brief stays with the brand.
            </h2>
            <p>
              One company, a glass icon, a banner, one hex. Up to ten topics
              become a hosted site with the same layout on every page.
            </p>
            <ul>
              <li>Glass icon in the header and the browser tab</li>
              <li>Banner across the top of the site</li>
              <li>About 1000 words per topic</li>
              <li>Homepage copy filled by MiMo when a key is set</li>
            </ul>
          </div>

          <div>
            <fieldset className="pick-set">
              <legend>Select website</legend>
              <div className="layout-pick">
                <img src={`/banners/${selectedBanner.file}`} alt="" />
                <div>
                  <strong>Portfolio</strong>
                  <small>Banner, glass icon, a hello line, and a work list.</small>
                </div>
              </div>

              <p className="pick-label">Site icon</p>
              <div className="icon-grid" role="listbox" aria-label="Nucleo glass icons">
                {GLASS_ICONS.map((icon) => {
                  const Icon = icon.Icon;
                  return (
                    <button
                      key={icon.id}
                      type="button"
                      className={icon.id === iconId ? "icon-pick is-on" : "icon-pick"}
                      aria-label={icon.label}
                      aria-pressed={icon.id === iconId}
                      onClick={() => {
                        setIconId(icon.id);
                        onLogo(null);
                        const input = document.getElementById("logo-input");
                        if (input instanceof HTMLInputElement) input.value = "";
                      }}
                    >
                      <Icon size={26} uniqueId={`pick-${icon.id}`} aria-hidden />
                    </button>
                  );
                })}
              </div>
              <p className="field-note">
                {preview
                  ? "Custom mark replaces the glass icon on the site."
                  : `Nucleo glass icons · ${selectedIcon.label}`}
              </p>

              <div
                className="logo-drop"
                onClick={() => document.getElementById("logo-input")?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file) onLogo(file);
                }}
              >
                {preview ? (
                  <img src={preview} alt="Custom mark preview" />
                ) : (
                  <span className="logo-glyph">
                    <SelectedIcon size={28} uniqueId="drop-mark" aria-hidden />
                  </span>
                )}
                <div className="hint">
                  <strong>{logo ? logo.name : "Optional custom mark"}</strong>
                  PNG, JPG, WEBP, or SVG · under 4MB
                </div>
              </div>
              <input
                id="logo-input"
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => onLogo(e.target.files?.[0] ?? null)}
              />

              <p className="pick-label">Banner</p>
              <div className="banner-grid" role="listbox" aria-label="Banner images">
                {BANNERS.map((banner) => (
                  <button
                    key={banner.id}
                    type="button"
                    className={banner.id === bannerId ? "banner-pick is-on" : "banner-pick"}
                    aria-label={banner.label}
                    aria-pressed={banner.id === bannerId}
                    onClick={() => setBannerId(banner.id)}
                  >
                    <img src={`/banners/${banner.file}`} alt="" />
                  </button>
                ))}
              </div>
              <p className="field-note">
                {selectedBanner.label} · {BANNERS.length} editorial stills
              </p>
            </fieldset>

            <label className="field">
              <span>Company name</span>
              <input
                type="text"
                placeholder="Northwind"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />
            </label>

            <label className="field">
              <span>Brand colour</span>
              <div className="color-row">
                <input
                  type="color"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value.toUpperCase())}
                  aria-label="Brand colour picker"
                />
                <input
                  type="text"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value.toUpperCase())}
                  pattern="^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$"
                  placeholder="#3286FF"
                  required
                />
              </div>
            </label>

            <label className="field">
              <span>Blog topics · one per line</span>
              <textarea
                value={topicsText}
                onChange={(e) => setTopicsText(e.target.value)}
                placeholder={"Topic one\nTopic two\n…"}
              />
            </label>
            <div className="topics-meta">
              <span>{topics.length} / 10 topics</span>
              <button
                type="button"
                className="btn btn-soft"
                onClick={() => setTopicsText(SAMPLE_TOPICS.join("\n"))}
              >
                Reset sample
              </button>
            </div>

            <label className="field">
              <span>MiMo API key</span>
              <input
                type="password"
                autoComplete="off"
                placeholder="sk-… or tp-…  · optional"
                value={mimoKey}
                onChange={(e) => setMimoKey(e.target.value)}
              />
            </label>
            <p className="field-note">
              Fills the homepage and each essay. Leave this blank to use the
              server key, or the built-in writer.
            </p>

            <div className="actions">
              <button className="btn btn-primary" type="submit" disabled={busy}>
                {busy ? "Starting…" : "Generate & host pages"}
              </button>
              <span className="model-chip">
                Writer · {mimoKey.trim() ? "MiMo (this run)" : model}
              </span>
            </div>
            {error && <p className="error">{error}</p>}
          </div>
        </form>
      </section>

      <section className="k-close">
        <h2>
          Open a journal.
          <br />
          Ship the words.
        </h2>
        <p>
          Create a site in a minute. Invite the brand in with a logo. Keep the
          essays, the colour, and the URL together.
        </p>
        <div className="k-actions">
          <a className="btn btn-primary" href="#create">
            Start a journal
          </a>
          <Link className="btn btn-soft" to="/sites">
            View sites
          </Link>
        </div>
      </section>

      <footer className="k-footer">
        <div className="k-foot-grid">
          <div>
            <p>Product</p>
            <ul>
              <li><a href="#journal">Logo</a></li>
              <li><a href="#journal">Colour</a></li>
              <li><a href="#journal">Topics</a></li>
              <li><a href="#create">Hosting</a></li>
            </ul>
          </div>
          <div>
            <p>Workspace</p>
            <ul>
              <li><a href="#how">Create</a></li>
              <li><a href="#journal">Journal</a></li>
              <li><Link to="/sites">Sites</Link></li>
            </ul>
          </div>
          <div>
            <p>Company</p>
            <ul>
              <li><Link to="/">atelier.</Link></li>
              <li><a href="#create">Generate</a></li>
            </ul>
          </div>
        </div>
        <p className="k-copy">© atelier.</p>
        <div className="k-wordmark" aria-hidden>
          <p>atelier</p>
        </div>
      </footer>
    </>
  );
}
