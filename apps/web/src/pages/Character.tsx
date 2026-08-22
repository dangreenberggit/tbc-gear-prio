/**
 * `/c/$region/$realm/$name` — the trust beat (PLAN.md §12).
 *
 * Renders the character's real logged gear before asking for a minute of the
 * user's attention, and turns "most recent fight" from a guess into a visible
 * choice.
 */
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ApiError,
  fetchCharacter,
  submitJob,
  type FightOption,
} from "../api.js";
import { runPath } from "../router.js";
import { SLOT_LABELS, UI_SLOT_ORDER } from "../slots.js";
import type { Navigate } from "../App.js";

type Props = {
  region: string;
  realm: string;
  name: string;
  navigate: Navigate;
};

/**
 * Most recent first. `killedAt` is optional on a `FightSummary` — a raw report
 * capture cannot supply a wall clock — so undated fights sort last rather than
 * being read as epoch zero and jumping to the bottom of a descending sort by
 * accident.
 */
function mostRecentFirst(fights: readonly FightOption[]): FightOption[] {
  return [...fights].sort((a, b) => {
    if (a.killedAt === undefined && b.killedAt === undefined) return 0;
    if (a.killedAt === undefined) return 1;
    if (b.killedAt === undefined) return -1;
    return b.killedAt.localeCompare(a.killedAt);
  });
}

function fightKey(f: FightOption): string {
  return `${f.reportCode}:${String(f.fightId)}`;
}

export function Character({ region, realm, name, navigate }: Props) {
  const query = useQuery({
    queryKey: ["character", region, realm, name],
    queryFn: () => fetchCharacter(region, realm, name),
    retry: false,
  });

  const [chosen, setChosen] = useState<string | undefined>(undefined);

  const rank = useMutation({
    mutationFn: submitJob,
    onSuccess: ({ id }) => {
      navigate(runPath(id));
    },
  });

  if (query.isPending) {
    return (
      <main className="page">
        <h1>{name}</h1>
        <p className="framing">Reading logged gear&hellip;</p>
      </main>
    );
  }

  if (query.isError) {
    const offline =
      query.error instanceof ApiError && query.error.status === 404;
    return (
      <main className="page page--narrow">
        <h1>{name}</h1>
        <div className="error">
          {offline ? (
            <p>
              This build is offline and resolves only its three recorded
              characters. <code>{name}</code> on {realm} ({region.toUpperCase()}
              ) is not one of them.
            </p>
          ) : (
            <p>Could not read this character: {query.error.message}</p>
          )}
          <p>
            <a href="/">Try another character</a>
          </p>
        </div>
      </main>
    );
  }

  const character = query.data;
  const fights = mostRecentFirst(character.fights);
  const selectedKey = chosen ?? (fights[0] ? fightKey(fights[0]) : undefined);
  const selected = fights.find((f) => fightKey(f) === selectedKey);
  const bySlot = new Map(character.gear.items.map((i) => [i.slot, i]));

  return (
    <main className="page">
      <h1>{name}</h1>
      <p className="framing">
        {realm} ({region.toUpperCase()}) &middot; {character.spec} &middot; gear
        as logged
      </p>

      <h2>Equipped</h2>
      <ul className="slot-grid">
        {UI_SLOT_ORDER.map((slot) => {
          const item = bySlot.get(slot);
          return (
            <li
              key={slot}
              className={item ? "slot" : "slot slot--empty"}
              data-slot={slot}
            >
              <span className="slot__name">{SLOT_LABELS[slot]}</span>
              <span className="slot__item">
                {item ? (item.name ?? `#${String(item.id)}`) : "empty"}
              </span>
            </li>
          );
        })}
      </ul>

      <h2>Fight</h2>
      {fights.length === 0 ? (
        <p className="muted">No qualifying fights for this character.</p>
      ) : (
        <ul className="fights">
          {fights.map((f) => {
            const key = fightKey(f);
            return (
              <li key={key}>
                <label className="toggle">
                  <input
                    type="radio"
                    name="fight"
                    value={key}
                    checked={key === selectedKey}
                    onChange={() => {
                      setChosen(key);
                    }}
                  />{" "}
                  {f.encounterName}{" "}
                  <span className="fight-meta">
                    {f.killedAt ?? "date unknown"} &middot; {f.route}
                    {f.confidence < 1 &&
                      ` · confidence ${f.confidence.toFixed(2)}`}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}

      <button
        type="button"
        disabled={selected === undefined || rank.isPending}
        onClick={() => {
          if (!selected) return;
          rank.mutate({
            character: { region, realm, name },
            spec: character.spec,
            fight: {
              reportCode: selected.reportCode,
              fightId: selected.fightId,
            },
          });
        }}
      >
        {rank.isPending ? "Starting…" : "Rank upgrades"}
      </button>

      {rank.isError && (
        <p className="muted">Could not start the run: {rank.error.message}</p>
      )}
    </main>
  );
}
