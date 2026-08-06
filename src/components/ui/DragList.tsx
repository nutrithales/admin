"use client";

import { useState } from "react";
import { GripVertical } from "lucide-react";
import { cn } from "@/utils/cn";

export interface DragListProps<T> {
  items: T[];
  onReorder: (items: T[]) => void;
  keyFor: (item: T) => string;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
}

/** Reordenação via HTML5 drag-and-drop nativo — sem dependência nova, já
 * que as listas aqui são sempre lineares (itens de uma refeição). */
export function DragList<T>({ items, onReorder, keyFor, renderItem, className }: DragListProps<T>) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  function handleDrop(index: number) {
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null);
      setOverIndex(null);
      return;
    }
    const next = [...items];
    const moved = next.splice(dragIndex, 1)[0];
    if (moved !== undefined) next.splice(index, 0, moved);
    onReorder(next);
    setDragIndex(null);
    setOverIndex(null);
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {items.map((item, index) => (
        <div
          key={keyFor(item)}
          draggable
          onDragStart={() => setDragIndex(index)}
          onDragOver={(e) => {
            e.preventDefault();
            setOverIndex(index);
          }}
          onDragEnd={() => {
            setDragIndex(null);
            setOverIndex(null);
          }}
          onDrop={() => handleDrop(index)}
          className={cn(
            "flex items-start gap-1 rounded-lg border border-border bg-surface transition-shadow",
            dragIndex === index && "opacity-50",
            overIndex === index && dragIndex !== index && "ring-2 ring-brand",
          )}
        >
          <div className="flex cursor-grab items-center self-stretch px-1.5 text-muted-light active:cursor-grabbing">
            <GripVertical className="size-4" />
          </div>
          <div className="flex-1 py-2 pr-2">{renderItem(item, index)}</div>
        </div>
      ))}
    </div>
  );
}
