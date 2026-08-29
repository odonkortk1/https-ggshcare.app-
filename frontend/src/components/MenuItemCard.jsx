import React from "react";
import { Plus, Clock, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MenuItemCard({ item, onAdd }) {
  if (!item) return null;

  // Safe numerical parsing for PostgreSQL numeric strings
  const price = Number(item.price || 0).toFixed(2);

  // Fallback checks for PostgreSQL vs SQLite field names
  const imageUrl = item.image_url || item.imageUrl || "";
  const isAvailable = item.available ?? item.is_available ?? true;
  const isSpecial = item.is_special || item.special || false;

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-card border border-border/60 shadow-sm hover:shadow-md transition-all duration-300">
      <div className="relative h-44 overflow-hidden bg-muted">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={item.name || "Menu Item"}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground bg-muted">
            No image
          </div>
        )}

        {isSpecial && (
          <span className="absolute top-3 left-3 bg-blue-600 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-sm">
            Daily Special
          </span>
        )}

        {!isAvailable && (
          <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
            <span className="text-sm font-medium text-muted-foreground">Out of stock</span>
          </div>
        )}
      </div>

      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-heading font-semibold text-[15px] leading-tight">{item.name}</h3>
          <span className="font-semibold text-blue-700 whitespace-nowrap">{"\u20B5"}{price}</span>
        </div>

        {item.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{item.description}</p>
        )}

        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          {item.prep_time_minutes && (
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {item.prep_time_minutes} min</span>
          )}
          {item.calories && (
            <span className="flex items-center gap-1"><Flame className="w-3 h-3" /> {item.calories} cal</span>
          )}
        </div>

        <Button
          size="sm"
          className="w-full mt-1 bg-blue-600 hover:bg-blue-700 text-white"
          disabled={!isAvailable}
          onClick={() => onAdd && onAdd(item)}
        >
          <Plus className="w-4 h-4 mr-1" /> Add to order
        </Button>
      </div>
    </div>
  );
}