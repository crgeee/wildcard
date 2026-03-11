import Router, { Route } from "preact-router";
import { Layout } from "./components/layout";
import { EditorPage } from "./pages/editor";
import { PlayerPage } from "./pages/player";
import { GalleryPage } from "./pages/gallery";
import { LearnPage } from "./pages/learn";
import { LegalPage } from "./pages/legal";

export function App() {
  return (
    <Layout>
      <Router>
        <Route path="/" component={EditorPage} />
        <Route path="/play/:id" component={PlayerPage} />
        <Route path="/gallery" component={GalleryPage} />
        <Route path="/learn" component={LearnPage} />
        <Route path="/legal" component={LegalPage} />
      </Router>
    </Layout>
  );
}
