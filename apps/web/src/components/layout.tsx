import type { ComponentChildren } from "preact";

interface LayoutProps {
  children: ComponentChildren;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div class="wc-layout">
      <header class="wc-header">
        <nav class="wc-nav">
          <a href="/" class="wc-logo">
            WildCard
          </a>
          <div class="wc-nav-links">
            <a href="/" class="wc-nav-link">
              Editor
            </a>
            <a href="/gallery" class="wc-nav-link">
              Gallery
            </a>
            <a href="/learn" class="wc-nav-link">
              Learn
            </a>
          </div>
        </nav>
      </header>

      <main class="wc-main">{children}</main>

      <footer class="wc-footer">
        <p class="wc-disclaimer">
          WildCard is not affiliated with Apple. HyperCard&#8482; is a trademark of Apple Inc.
          &middot;{" "}
          <a href="/legal" class="wc-footer-link">
            Legal
          </a>
        </p>
      </footer>
    </div>
  );
}
