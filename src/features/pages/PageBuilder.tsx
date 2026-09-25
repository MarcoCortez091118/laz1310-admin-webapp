import {
  ArrowDown,
  ArrowUp,
  CreditCard,
  FileText,
  LayoutTemplate,
  ListMusic,
  Plus,
  Radio,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import type {
  Card,
  CardsBlock,
  HeroBlock,
  Link,
  Page,
  PageBlock,
  RadioBlock,
  ShowsBlock,
  Station,
  TextBlock,
} from "../../api/types";
import {
  blockName,
  createBlock,
  type BlockKind,
  moveBlock,
  removeBlock,
  replaceBlock,
} from "./pageBuilderModel";

const BLOCK_OPTIONS: Array<{
  type: BlockKind;
  label: string;
  icon: typeof LayoutTemplate;
}> = [
  { type: "hero", label: "Hero", icon: LayoutTemplate },
  { type: "text", label: "Text", icon: FileText },
  { type: "radio_player", label: "Radio Player", icon: Radio },
  { type: "show_list", label: "Show List", icon: ListMusic },
  { type: "cards", label: "Cards", icon: CreditCard },
];

function nullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function LinkEditor({
  link,
  pages,
  onChange,
}: {
  link: Link | null | undefined;
  pages: Page[];
  onChange: (link: Link | null) => void;
}) {
  const mode = link?.kind ?? "none";
  const pageSlugs = pages.map((page) => page.slug).filter(Boolean);

  return (
    <div className="link-editor">
      <label>
        Link
        <select
          onChange={(event) => {
            const next = event.target.value;
            if (next === "none") {
              onChange(null);
              return;
            }
            if (next === "page") {
              onChange({ kind: "page", target: pageSlugs[0] ?? "" });
              return;
            }
            onChange({ kind: "external", target: "https://" });
          }}
          value={mode}
        >
          <option value="none">None</option>
          <option disabled={pageSlugs.length === 0} value="page">
            Internal page
          </option>
          <option value="external">External HTTPS</option>
        </select>
      </label>

      {mode === "page" ? (
        <label>
          Target page
          <select
            onChange={(event) => onChange({ kind: "page", target: event.target.value })}
            value={link?.target ?? pageSlugs[0] ?? ""}
          >
            {pageSlugs.map((slug) => (
              <option key={slug} value={slug}>
                /{slug}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {mode === "external" ? (
        <label>
          HTTPS URL
          <input
            onChange={(event) =>
              onChange({ kind: "external", target: event.target.value })
            }
            placeholder="https://example.com"
            type="url"
            value={link?.target ?? ""}
          />
        </label>
      ) : null}
    </div>
  );
}

function HeroEditor({
  block,
  pages,
  onChange,
}: {
  block: HeroBlock;
  pages: Page[];
  onChange: (block: HeroBlock) => void;
}) {
  return (
    <div className="block-form-grid">
      <label className="field-span">
        Title
        <input
          maxLength={160}
          onChange={(event) => onChange({ ...block, title: event.target.value })}
          value={block.title}
        />
      </label>
      <label className="field-span">
        Subtitle
        <textarea
          maxLength={300}
          onChange={(event) =>
            onChange({ ...block, subtitle: nullable(event.target.value) })
          }
          rows={2}
          value={block.subtitle ?? ""}
        />
      </label>
      <label className="field-span">
        Image URL
        <input
          onChange={(event) =>
            onChange({ ...block, imageUrl: nullable(event.target.value) })
          }
          placeholder="https://..."
          type="url"
          value={block.imageUrl ?? ""}
        />
      </label>
      <div className="field-span">
        <LinkEditor
          link={block.link}
          onChange={(link) => onChange({ ...block, link })}
          pages={pages}
        />
      </div>
    </div>
  );
}

function TextEditor({
  block,
  onChange,
}: {
  block: TextBlock;
  onChange: (block: TextBlock) => void;
}) {
  return (
    <label className="field-span">
      Plain text
      <textarea
        maxLength={5000}
        onChange={(event) => onChange({ ...block, text: event.target.value })}
        rows={7}
        value={block.text}
      />
      <small>Plain text only. The API does not accept a rich-text/HTML contract.</small>
    </label>
  );
}

function StationEditor({
  block,
  stations,
  onChange,
}: {
  block: RadioBlock | ShowsBlock;
  stations: Station[];
  onChange: (block: RadioBlock | ShowsBlock) => void;
}) {
  const available = stations.filter((station) => Boolean(station.id));

  return (
    <label className="field-span">
      Station
      <select
        onChange={(event) => onChange({ ...block, stationId: event.target.value })}
        value={block.stationId}
      >
        {available.map((station) => (
          <option key={station.id} value={station.id}>
            {station.name}
          </option>
        ))}
      </select>
      <small>
        The backend validates that the referenced station exists before publication.
      </small>
    </label>
  );
}

function CardEditor({
  card,
  pages,
  canRemove,
  onChange,
  onRemove,
}: {
  card: Card;
  pages: Page[];
  canRemove: boolean;
  onChange: (card: Card) => void;
  onRemove: () => void;
}) {
  return (
    <div className="card-editor">
      <div className="card-editor-heading">
        <strong>{card.title || "Untitled card"}</strong>
        <button
          className="icon-button danger-ghost"
          disabled={!canRemove}
          onClick={onRemove}
          title={canRemove ? "Remove card" : "Cards block requires at least one item"}
          type="button"
        >
          <Trash2 size={15} />
        </button>
      </div>
      <label>
        Title
        <input
          maxLength={160}
          onChange={(event) => onChange({ ...card, title: event.target.value })}
          value={card.title}
        />
      </label>
      <label>
        Image URL
        <input
          onChange={(event) =>
            onChange({ ...card, imageUrl: nullable(event.target.value) })
          }
          placeholder="https://..."
          type="url"
          value={card.imageUrl ?? ""}
        />
      </label>
      <LinkEditor
        link={card.link}
        onChange={(link) => onChange({ ...card, link })}
        pages={pages}
      />
    </div>
  );
}

function CardsEditor({
  block,
  pages,
  onChange,
}: {
  block: CardsBlock;
  pages: Page[];
  onChange: (block: CardsBlock) => void;
}) {
  const items = block.items ?? [];

  function updateCard(index: number, card: Card) {
    onChange({
      ...block,
      items: items.map((current, currentIndex) =>
        currentIndex === index ? card : current,
      ),
    });
  }

  return (
    <div className="cards-editor field-span">
      {items.map((card, index) => (
        <CardEditor
          canRemove={items.length > 1}
          card={card}
          key={`${card.title}-${index}`}
          onChange={(next) => updateCard(index, next)}
          onRemove={() =>
            onChange({
              ...block,
              items: items.filter((_, currentIndex) => currentIndex !== index),
            })
          }
          pages={pages}
        />
      ))}

      <button
        className="secondary-button"
        disabled={items.length >= 20}
        onClick={() =>
          onChange({
            ...block,
            items: [
              ...items,
              { title: "New card", imageUrl: null, link: null },
            ],
          })
        }
        type="button"
      >
        <Plus size={15} />
        Add card
      </button>
    </div>
  );
}

function BlockEditor({
  block,
  index,
  blocks,
  pages,
  stations,
  onBlocksChange,
}: {
  block: PageBlock;
  index: number;
  blocks: PageBlock[];
  pages: Page[];
  stations: Station[];
  onBlocksChange: (blocks: PageBlock[]) => void;
}) {
  return (
    <article className="block-editor">
      <header className="block-editor-heading">
        <div>
          <span>{index + 1}</span>
          <strong>{blockName(block)}</strong>
          <code>{block.id?.slice(0, 8) ?? "new"}</code>
        </div>
        <div className="block-controls">
          <button
            className="icon-button"
            disabled={index === 0}
            onClick={() => onBlocksChange(moveBlock(blocks, index, -1))}
            title="Move up"
            type="button"
          >
            <ArrowUp size={15} />
          </button>
          <button
            className="icon-button"
            disabled={index === blocks.length - 1}
            onClick={() => onBlocksChange(moveBlock(blocks, index, 1))}
            title="Move down"
            type="button"
          >
            <ArrowDown size={15} />
          </button>
          <button
            className="icon-button danger-ghost"
            onClick={() => onBlocksChange(removeBlock(blocks, index))}
            title="Remove block"
            type="button"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </header>

      <div className="block-editor-body">
        {block.type === "hero" ? (
          <HeroEditor
            block={block}
            onChange={(next) =>
              onBlocksChange(replaceBlock(blocks, index, next))
            }
            pages={pages}
          />
        ) : null}

        {block.type === "text" ? (
          <TextEditor
            block={block}
            onChange={(next) =>
              onBlocksChange(replaceBlock(blocks, index, next))
            }
          />
        ) : null}

        {block.type === "radio_player" || block.type === "show_list" ? (
          <StationEditor
            block={block}
            onChange={(next) =>
              onBlocksChange(replaceBlock(blocks, index, next))
            }
            stations={stations}
          />
        ) : null}

        {block.type === "cards" ? (
          <CardsEditor
            block={block}
            onChange={(next) =>
              onBlocksChange(replaceBlock(blocks, index, next))
            }
            pages={pages}
          />
        ) : null}
      </div>
    </article>
  );
}

export function PageBuilder({
  page,
  pages,
  stations,
  onChange,
}: {
  page: Page;
  pages: Page[];
  stations: Station[];
  onChange: (page: Page) => void;
}) {
  const blocks = page.blocks ?? [];
  const [nextType, setNextType] = useState<BlockKind>("hero");
  const stationsWithIds = useMemo(
    () => stations.filter((station) => Boolean(station.id)),
    [stations],
  );
  const needsStation = nextType === "radio_player" || nextType === "show_list";
  const firstStationId = stationsWithIds[0]?.id;

  return (
    <section className="page-builder">
      <header className="page-builder-heading">
        <div>
          <p className="eyebrow">Page Builder</p>
          <h3>{blocks.length} / 30 blocks</h3>
        </div>
        <div className="add-block-control">
          <select
            aria-label="Block type"
            onChange={(event) => setNextType(event.target.value as BlockKind)}
            value={nextType}
          >
            {BLOCK_OPTIONS.map((option) => (
              <option key={option.type} value={option.type}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            disabled={
              blocks.length >= 30 ||
              (needsStation && !firstStationId)
            }
            onClick={() => {
              const next = createBlock(nextType, firstStationId);
              onChange({ ...page, blocks: [...blocks, next] });
            }}
            type="button"
          >
            <Plus size={16} />
            Add block
          </button>
        </div>
      </header>

      {needsStation && !firstStationId ? (
        <p className="builder-warning">
          Add a station to the Draft before inserting this block type.
        </p>
      ) : null}

      <div className="block-list">
        {blocks.length ? (
          blocks.map((block, index) => (
            <BlockEditor
              block={block}
              blocks={blocks}
              index={index}
              key={block.id ?? `${block.type ?? "block"}-${index}`}
              onBlocksChange={(nextBlocks) =>
                onChange({ ...page, blocks: nextBlocks })
              }
              pages={pages}
              stations={stations}
            />
          ))
        ) : (
          <div className="builder-empty">
            <LayoutTemplate size={24} />
            <strong>This page has no blocks.</strong>
            <span>Add Hero, Text, Radio Player, Show List or Cards.</span>
          </div>
        )}
      </div>
    </section>
  );
}
