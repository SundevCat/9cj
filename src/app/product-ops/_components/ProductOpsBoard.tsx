"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  DragOverlay,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Card = {
  id: number;
  title: string;
  description: string | null;
  status: "BACKLOG" | "IN_PROGRESS" | "REVIEW" | "DONE";
  priority: "HIGH" | "MEDIUM" | "LOW";
  moduleTag: string | null;
  dueDate: string | null;
  position: number;
};

const COLUMNS: { id: Card["status"]; label: string; tone: string }[] = [
  { id: "BACKLOG",     label: "Backlog",     tone: "text-ink-muted" },
  { id: "IN_PROGRESS", label: "In Progress", tone: "text-accent-blue" },
  { id: "REVIEW",      label: "Review",      tone: "text-accent-amber" },
  { id: "DONE",        label: "Done",        tone: "text-accent-green" },
];

const PRIORITY_TONE: Record<string, string> = {
  HIGH:   "bg-accent-red/15 text-accent-red ring-accent-red/40",
  MEDIUM: "bg-accent-amber/15 text-accent-amber ring-accent-amber/40",
  LOW:    "bg-accent-blue/15 text-accent-blue ring-accent-blue/40",
};

export function ProductOpsBoard() {
  const [cards, setCards] = useState<Card[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [addingTo, setAddingTo] = useState<Card["status"] | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<"HIGH" | "MEDIUM" | "LOW">("MEDIUM");
  const [newTag, setNewTag] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  async function load() {
    const res = await fetch("/api/kanban", { cache: "no-store" });
    const j = await res.json();
    setCards(j.cards);
  }
  useEffect(() => { load(); }, []);

  // Group cards by column, sorted by position
  const grouped = useMemo(() => {
    const out: Record<Card["status"], Card[]> = {
      BACKLOG: [], IN_PROGRESS: [], REVIEW: [], DONE: [],
    };
    for (const c of cards) out[c.status]?.push(c);
    for (const k of Object.keys(out) as Card["status"][]) {
      out[k].sort((a, b) => a.position - b.position);
    }
    return out;
  }, [cards]);

  const active = useMemo(() => cards.find((c) => c.id === activeId), [activeId, cards]);

  function findContainer(id: number): Card["status"] | null {
    const card = cards.find((c) => c.id === id);
    return card?.status ?? null;
  }

  function onDragStart(e: DragStartEvent) {
    setActiveId(Number(e.active.id));
  }

  function onDragOver(e: DragOverEvent) {
    const { active, over } = e;
    if (!over) return;
    const activeId = Number(active.id);
    const overIdRaw = String(over.id);

    const activeContainer = findContainer(activeId);
    // Over a column droppable
    const isOverColumn = (COLUMNS.map((c) => c.id) as string[]).includes(overIdRaw);
    const overContainer = isOverColumn ? (overIdRaw as Card["status"]) : findContainer(Number(overIdRaw));

    if (!activeContainer || !overContainer || activeContainer === overContainer) return;

    setCards((prev) => {
      const next = prev.map((c) => (c.id === activeId ? { ...c, status: overContainer } : c));
      return next;
    });
  }

  async function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;
    const activeId = Number(active.id);
    const overIdRaw = String(over.id);
    const activeCard = cards.find((c) => c.id === activeId);
    if (!activeCard) return;

    const isOverColumn = (COLUMNS.map((c) => c.id) as string[]).includes(overIdRaw);
    const targetCol: Card["status"] = isOverColumn ? (overIdRaw as Card["status"]) : (cards.find((c) => c.id === Number(overIdRaw))?.status ?? activeCard.status);

    setCards((prev) => {
      // Within-column reordering
      const colCards = prev.filter((c) => c.status === targetCol).sort((a, b) => a.position - b.position);
      const otherCards = prev.filter((c) => c.status !== targetCol);
      const updatedActive = { ...activeCard, status: targetCol };
      const withoutActive = colCards.filter((c) => c.id !== activeId);

      let newIndex: number;
      if (isOverColumn) {
        newIndex = withoutActive.length;
      } else {
        newIndex = withoutActive.findIndex((c) => c.id === Number(overIdRaw));
        if (newIndex < 0) newIndex = withoutActive.length;
      }
      const reordered = arrayMove(
        [...withoutActive.slice(0, newIndex), updatedActive, ...withoutActive.slice(newIndex)],
        withoutActive.findIndex((c) => c.id === activeId),
        newIndex
      ).filter(Boolean);

      // Rebuild with new positions
      const reIndexed: Card[] = reordered.map((c, i) => ({ ...c, position: i }));
      const next = [...otherCards, ...reIndexed];

      // Persist asynchronously
      const updates = reIndexed.map((c) => ({ id: c.id, status: c.status, position: c.position }));
      // Include the original column if it changed, to renormalize positions there too
      if (activeCard.status !== targetCol) {
        const origCards = prev.filter((c) => c.status === activeCard.status && c.id !== activeId).sort((a, b) => a.position - b.position);
        origCards.forEach((c, i) => updates.push({ id: c.id, status: c.status, position: i }));
      }
      fetch("/api/kanban/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });

      return next;
    });
  }

  async function addCard(col: Card["status"]) {
    if (!newTitle.trim()) return;
    await fetch("/api/kanban", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle, status: col, priority: newPriority, moduleTag: newTag || null }),
    });
    setNewTitle(""); setNewTag(""); setAddingTo(null);
    await load();
  }

  async function deleteCard(id: number) {
    await fetch(`/api/kanban/${id}`, { method: "DELETE" });
    setCards((prev) => prev.filter((c) => c.id !== id));
  }

  async function seedDemo() {
    await fetch("/api/phase4/seed-demo", { method: "POST" });
    await load();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="mono text-[11px] text-ink-dim">
          Drag cards between columns or within. {cards.length} total · grouped by status.
        </div>
        {cards.length === 0 && (
          <button
            onClick={seedDemo}
            className="mono text-[10px] uppercase tracking-widest py-1.5 px-3 rounded bg-accent-purple/15 text-accent-purple border border-accent-purple/40 hover:bg-accent-purple/25"
          >
            load demo board
          </button>
        )}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {COLUMNS.map((col) => (
            <Column
              key={col.id}
              col={col}
              cards={grouped[col.id]}
              onAdd={() => setAddingTo(col.id)}
              addingHere={addingTo === col.id}
              cancelAdd={() => { setAddingTo(null); setNewTitle(""); setNewTag(""); }}
              onSubmit={() => addCard(col.id)}
              newTitle={newTitle} setNewTitle={setNewTitle}
              newPriority={newPriority} setNewPriority={setNewPriority}
              newTag={newTag} setNewTag={setNewTag}
              onDelete={deleteCard}
            />
          ))}
        </div>

        <DragOverlay>
          {active ? <CardView card={active} dragging /> : null}
        </DragOverlay>
      </DndContext>

      <style jsx>{`
        .input {
          background: #0a0c10;
          border: 1px solid #1f242d;
          border-radius: 6px;
          padding: 6px 10px;
          font-family: var(--font-space-mono), monospace;
          font-size: 12px;
          color: #e6e9ef;
          width: 100%;
        }
        .input:focus {
          outline: none;
          border-color: #63B3ED;
        }
      `}</style>
    </div>
  );
}

function Column({
  col, cards, onAdd, addingHere, cancelAdd, onSubmit, newTitle, setNewTitle, newPriority, setNewPriority, newTag, setNewTag, onDelete,
}: {
  col: { id: Card["status"]; label: string; tone: string };
  cards: Card[];
  onAdd: () => void;
  addingHere: boolean;
  cancelAdd: () => void;
  onSubmit: () => void;
  newTitle: string; setNewTitle: (s: string) => void;
  newPriority: "HIGH" | "MEDIUM" | "LOW"; setNewPriority: (p: "HIGH" | "MEDIUM" | "LOW") => void;
  newTag: string; setNewTag: (s: string) => void;
  onDelete: (id: number) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });
  return (
    <div
      ref={setNodeRef}
      className={`panel p-3 flex flex-col gap-2 min-h-[280px] transition-colors ${isOver ? "border-accent-blue/40 bg-accent-blue/5" : ""}`}
    >
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className={`display text-sm font-semibold ${col.tone}`}>{col.label}</span>
          <span className="mono text-[10px] text-ink-dim">{cards.length}</span>
        </div>
        <button
          onClick={onAdd}
          className="mono text-[10px] uppercase tracking-widest text-ink-dim hover:text-accent-blue"
          title="add card"
        >
          + add
        </button>
      </div>

      <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2">
          {cards.map((c) => (
            <SortableCard key={c.id} card={c} onDelete={onDelete} />
          ))}
          {cards.length === 0 && !addingHere && (
            <div className="mono text-[10px] text-ink-dim text-center py-6 border border-dashed border-line rounded">
              drop here
            </div>
          )}
        </div>
      </SortableContext>

      {addingHere && (
        <div className="bg-bg-raised rounded p-2 flex flex-col gap-2 border border-accent-blue/30">
          <input
            autoFocus
            placeholder="card title…"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSubmit();
              if (e.key === "Escape") cancelAdd();
            }}
            className="input"
          />
          <div className="flex gap-2">
            <select value={newPriority} onChange={(e) => setNewPriority(e.target.value as "HIGH" | "MEDIUM" | "LOW")} className="input flex-1">
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>
            <input placeholder="tag" value={newTag} onChange={(e) => setNewTag(e.target.value)} className="input flex-1" />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={cancelAdd} className="mono text-[10px] uppercase tracking-widest px-2 py-1 text-ink-muted hover:text-ink">cancel</button>
            <button onClick={onSubmit} className="mono text-[10px] uppercase tracking-widest px-2 py-1 rounded bg-accent-blue/15 text-accent-blue border border-accent-blue/40">add</button>
          </div>
        </div>
      )}
    </div>
  );
}

function SortableCard({ card, onDelete }: { card: Card; onDelete: (id: number) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <CardView card={card} onDelete={onDelete} />
    </div>
  );
}

function CardView({ card, dragging = false, onDelete }: { card: Card; dragging?: boolean; onDelete?: (id: number) => void }) {
  return (
    <div className={`bg-bg-raised rounded border border-line p-3 flex flex-col gap-2 ${dragging ? "shadow-glow" : "hover:border-accent-blue/30"} transition-colors cursor-grab active:cursor-grabbing`}>
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm text-ink flex-1">{card.title}</div>
        {onDelete && (
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onDelete(card.id)}
            className="mono text-[10px] text-ink-dim hover:text-accent-red shrink-0"
            title="delete"
          >
            ✕
          </button>
        )}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded ring-1 ${PRIORITY_TONE[card.priority]}`}>
          {card.priority}
        </span>
        {card.moduleTag && (
          <span className="mono text-[10px] text-ink-muted">#{card.moduleTag}</span>
        )}
        {card.dueDate && (
          <span className="mono text-[10px] text-accent-amber">
            due {new Date(card.dueDate).toLocaleDateString("en-GB")}
          </span>
        )}
      </div>
    </div>
  );
}
