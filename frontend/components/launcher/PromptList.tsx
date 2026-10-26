import { Inbox, Plus, SearchX, Star, TriangleAlert } from "lucide-react";
import PromptRow from "@/components/prompt/PromptRow";
import { PrimaryButton, SecondaryButton } from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import type { LoadState } from "@/hooks/usePrompts";
import type { Prompt } from "@/lib/prompts/types";

type PromptListProps = {
  load: LoadState;
  results: Prompt[];
  totalPrompts: number;
  selectedIndex: number;
  copiedId: number | null;
  activeTag: string | null;
  query: string;
  starredOnly: boolean;
  matchesOutsideFilters: number;
  onRetry: () => void;
  onCreate: () => void;
  onSelect: (prompt: Prompt) => void;
  onTagClick: (tag: string) => void;
  onToggleFavorite: (prompt: Prompt) => void;
  onEdit: (prompt: Prompt) => void;
  onDelete: (prompt: Prompt) => void;
  onCopy: (prompt: Prompt) => void;
  onPaste: (prompt: Prompt) => void;
  onClearQuery: () => void;
  onClearFilters: () => void;
};

export default function PromptList(props: PromptListProps) {
  const { load, results, totalPrompts, query, starredOnly, activeTag } = props;

  if (load.status === "loading") {
    return <EmptyState icon={<Inbox className="size-5" />} title="Loading prompts…" />;
  }
  if (load.status === "error") {
    return (
      <EmptyState
        icon={<TriangleAlert className="size-5" />}
        tone="error"
        title="Couldn't load your prompts"
        body={load.message}
        action={<SecondaryButton onClick={props.onRetry}>Try again</SecondaryButton>}
      />
    );
  }
  if (results.length > 0) {
    return (
      <ul className="h-full space-y-1 overflow-y-auto px-3 pb-3">
        {results.map((prompt, index) => (
          <PromptRow
            key={prompt.id}
            prompt={prompt}
            selected={index === props.selectedIndex}
            copied={props.copiedId === prompt.id}
            activeTag={activeTag}
            onSelect={() => props.onSelect(prompt)}
            onTagClick={props.onTagClick}
            onToggleFavorite={() => props.onToggleFavorite(prompt)}
            onEdit={() => props.onEdit(prompt)}
            onDelete={() => props.onDelete(prompt)}
            onCopy={() => props.onCopy(prompt)}
            onPaste={() => props.onPaste(prompt)}
          />
        ))}
      </ul>
    );
  }
  if (totalPrompts === 0) {
    return (
      <EmptyState
        icon={<Plus className="size-5" />}
        title="No prompts yet"
        body="Save the prompts you reuse so they're one search away."
        action={<PrimaryButton onClick={props.onCreate}>Create your first prompt</PrimaryButton>}
      />
    );
  }
  if (starredOnly && !query.trim() && !activeTag) {
    return (
      <EmptyState
        icon={<Star className="size-5" />}
        title="No starred prompts yet"
        body="Star the prompts you use most and they'll stay at the top."
        action={<SecondaryButton onClick={props.onClearFilters}>Show all prompts</SecondaryButton>}
      />
    );
  }

  const scope = [...(starredOnly ? ["starred"] : []), ...(activeTag ? [`#${activeTag}`] : [])].join(" + ");
  const trimmed = query.trim();
  const outside = props.matchesOutsideFilters;
  return (
    <EmptyState
      icon={<SearchX className="size-5" />}
      title={trimmed ? `No prompts match “${trimmed}”${scope ? ` in ${scope}` : ""}` : `No prompts in ${scope}`}
      body={
        outside > 0
          ? `${outside} ${outside === 1 ? "prompt matches" : "prompts match"} outside these filters.`
          : "Try a different word or fewer filters. Esc clears the search."
      }
      action={
        <>
          {scope && (
            <SecondaryButton onClick={props.onClearFilters}>
              {outside > 0 ? "Search everything" : "Clear filters"}
            </SecondaryButton>
          )}
          {trimmed && <SecondaryButton onClick={props.onClearQuery}>Clear search</SecondaryButton>}
        </>
      }
    />
  );
}
