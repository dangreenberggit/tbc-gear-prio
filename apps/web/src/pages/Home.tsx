/**
 * `/` — composition (PLAN.md §12). Brand, one line of framing, the form, one
 * CTA. No dashboard chrome, no stat cards.
 */
import { useState, type FormEvent } from "react";
import type { Navigate } from "../App.js";
import { characterPath } from "../router.js";

export function Home({ navigate }: { navigate: Navigate }) {
  const [region, setRegion] = useState("eu");
  const [realm, setRealm] = useState("");
  const [name, setName] = useState("");

  const ready = realm.trim() !== "" && name.trim() !== "";

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!ready) return;
    navigate(characterPath({ region, realm: realm.trim(), name: name.trim() }));
  }

  return (
    <main className="page page--narrow">
      <h1 className="brand">tbc gear prio</h1>
      <p className="framing">Tonight&rsquo;s upgrades, not your endgame set.</p>

      <form onSubmit={onSubmit}>
        <label className="field">
          <span>Region</span>
          <select
            value={region}
            onChange={(e) => {
              setRegion(e.target.value);
            }}
          >
            <option value="eu">EU</option>
            <option value="us">US</option>
          </select>
        </label>

        <label className="field">
          <span>Realm</span>
          <input
            value={realm}
            onChange={(e) => {
              setRealm(e.target.value);
            }}
            placeholder="Twisting Nether"
            autoComplete="off"
          />
        </label>

        <label className="field">
          <span>Character</span>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
            }}
            placeholder="Slamaltman"
            autoComplete="off"
          />
        </label>

        <button type="submit" disabled={!ready}>
          Look up gear
        </button>
      </form>
    </main>
  );
}
