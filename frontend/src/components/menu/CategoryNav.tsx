import { useEffect } from "react";
import type { Category } from "@/data/types";

interface CategoryNavProps {
  categories: Category[];
  activeId: string;
  onSelect: (id: string) => void;
}

// Barra sticky de categorias — scroll horizontal, chip ativo em laranja.
export default function CategoryNav({
  categories,
  activeId,
  onSelect,
}: CategoryNavProps) {
  useEffect(() => {
    const el = document.querySelector(
      `[data-testid="category-btn-${activeId}"]`,
    );
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [activeId]);

  return (
    <nav
      data-testid="category-nav-bar"
      aria-label="Categorias do cardápio"
      className="sticky top-16 z-30 border-b border-[#e9d7c2]/80 bg-[#fffaf3]/90 backdrop-blur-md"
    >
      <div className="no-scrollbar mx-auto flex max-w-5xl gap-2 overflow-x-auto px-4 py-2.5">
        {categories.map((category) => {
          const active = category.id === activeId;
          return (
            <button
              key={category.id}
              type="button"
              data-testid={`category-btn-${category.id}`}
              aria-pressed={active}
              onClick={() => onSelect(category.id)}
              className={`shrink-0 rounded-full border px-3.5 py-2 text-sm font-medium transition-[background-color,border-color,color,box-shadow] duration-200 ${
                active
                  ? "border-[#b94f19] bg-[#b94f19] text-white shadow-sm hover:bg-[#a44416] hover:border-[#a44416]"
                  : "border-[#e9d7c2] bg-white/80 text-[#604737] hover:border-[#b94f19]/70 hover:bg-[#f1e1cf] hover:text-[#33251e] hover:shadow-sm"
              }`}
            >
              {category.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
