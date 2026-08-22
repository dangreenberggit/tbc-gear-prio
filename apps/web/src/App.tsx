/**
 * The shell: history state, the route switch, and the attribution footer.
 *
 * No router library — `matchRoute` plus `history.pushState` is the whole need
 * for three routes, and a dependency here would be paid for in the bundle the
 * gate measures.
 */
import { useCallback, useEffect, useState } from "react";
import { matchRoute, type Route } from "./router.js";
import { Home } from "./pages/Home.js";
import { Character } from "./pages/Character.js";
import { Run } from "./pages/Run.js";
import { Footer } from "./components/Footer.js";

export type Navigate = (to: string) => void;

function currentRoute(): Route {
  return matchRoute(window.location.pathname);
}

export function App() {
  const [route, setRoute] = useState<Route>(currentRoute);

  useEffect(() => {
    const onPop = () => {
      setRoute(currentRoute());
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
    };
  }, []);

  const navigate = useCallback<Navigate>((to) => {
    window.history.pushState({}, "", to);
    setRoute(matchRoute(to));
  }, []);

  return (
    <>
      {renderRoute(route, navigate)}
      {/* /run/$id renders its own footer, which knows the job's simVersion. */}
      {route.name !== "run" && <Footer />}
    </>
  );
}

function renderRoute(route: Route, navigate: Navigate) {
  switch (route.name) {
    case "home":
      return <Home navigate={navigate} />;
    case "character":
      return (
        <Character
          region={route.region}
          realm={route.realm}
          name={route.name_}
          navigate={navigate}
        />
      );
    case "run":
      return <Run id={route.id} />;
    case "not-found":
      return (
        <main className="page page--narrow">
          <h1>Not found</h1>
          <p className="framing">
            No page at this address. <a href="/">Start over</a>.
          </p>
        </main>
      );
  }
}
