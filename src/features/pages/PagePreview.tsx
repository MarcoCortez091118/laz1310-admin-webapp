import type { Link, Page, Station } from "../../api/types";

function stationName(stationId: string | undefined, stations: Station[]): string {
  if (!stationId) {
    return "Unknown station";
  }
  return (
    stations.find((station) => station.id === stationId)?.name ??
    `Station ${stationId.slice(0, 8)}`
  );
}

function LinkLabel({ link }: { link: Link | null | undefined }) {
  if (!link) {
    return null;
  }

  return (
    <span className="preview-link">
      {link.kind === "external" ? "External" : "Page"} → {link.target}
    </span>
  );
}

export function PagePreview({
  page,
  stations,
  title,
  description,
}: {
  page: Page;
  stations: Station[];
  title: string;
  description: string;
}) {
  const blocks = page.blocks ?? [];

  return (
    <article className="panel preview-panel">
      <header className="preview-panel-heading">
        <div>
          <p className="eyebrow">{title}</p>
          <h2>{page.title || "Untitled page"}</h2>
          <p className="muted">{description}</p>
        </div>
        <code>/{page.slug || "new-page"}</code>
      </header>

      <div className="page-preview-canvas">
        {blocks.length === 0 ? (
          <div className="preview-empty">
            <strong>No blocks yet</strong>
            <span>Add a block to start composing this page.</span>
          </div>
        ) : null}

        {blocks.map((block, index) => {
          const key = block.id ?? `${block.type ?? "block"}-${index}`;

          switch (block.type) {
            case "hero":
              return (
                <section className="preview-hero" key={key}>
                  {block.imageUrl ? (
                    <img alt="" src={block.imageUrl} />
                  ) : (
                    <div className="preview-image-placeholder">Hero artwork</div>
                  )}
                  <div className="preview-hero-copy">
                    <span>LA Z 1310</span>
                    <h3>{block.title}</h3>
                    {block.subtitle ? <p>{block.subtitle}</p> : null}
                    <LinkLabel link={block.link} />
                  </div>
                </section>
              );

            case "text":
              return (
                <section className="preview-text" key={key}>
                  <p>{block.text}</p>
                </section>
              );

            case "radio_player":
              return (
                <section className="preview-radio" key={key}>
                  <div className="preview-radio-disc">Z</div>
                  <div>
                    <span>Live radio</span>
                    <strong>{stationName(block.stationId, stations)}</strong>
                  </div>
                  <button disabled type="button">
                    ▶
                  </button>
                </section>
              );

            case "show_list": {
              const station = stations.find((item) => item.id === block.stationId);
              const shows = station?.shows ?? [];

              return (
                <section className="preview-shows" key={key}>
                  <div className="preview-section-heading">
                    <span>Programming</span>
                    <strong>{station?.name ?? stationName(block.stationId, stations)}</strong>
                  </div>
                  {shows.length ? (
                    <div className="preview-show-grid">
                      {shows.slice(0, 6).map((show, showIndex) => (
                        <div className="preview-show-card" key={show.id ?? show.slug ?? showIndex}>
                          <div className="preview-show-art">
                            {show.imageUrl ? <img alt="" src={show.imageUrl} /> : <span>ON AIR</span>}
                          </div>
                          <strong>{show.name}</strong>
                          {show.hostName ? <small>{show.hostName}</small> : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="preview-inline-empty">No shows configured for this station.</p>
                  )}
                </section>
              );
            }

            case "cards":
              return (
                <section className="preview-cards" key={key}>
                  {(block.items ?? []).map((card, cardIndex) => (
                    <div className="preview-card" key={`${card.title}-${cardIndex}`}>
                      {card.imageUrl ? (
                        <img alt="" src={card.imageUrl} />
                      ) : (
                        <div className="preview-card-placeholder">LA Z</div>
                      )}
                      <div>
                        <strong>{card.title}</strong>
                        <LinkLabel link={card.link} />
                      </div>
                    </div>
                  ))}
                </section>
              );

            default:
              return (
                <section className="preview-unknown" key={key}>
                  Unsupported block in this Admin version.
                </section>
              );
          }
        })}
      </div>
    </article>
  );
}
