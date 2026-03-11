/**
 * Gallery page — community hub for browsing and sharing stacks.
 *
 * Placeholder layout. Will be populated in Task 5.3.
 */
export function GalleryPage() {
  return (
    <div class="wc-gallery">
      <h1>Gallery</h1>
      <p class="wc-gallery-subtitle">Community stacks built with WildCard.</p>

      <div class="wc-coming-soon">
        <h2>Coming Soon</h2>
        <p>
          The gallery will let you browse, share, and remix stacks created by the community. Stay
          tuned.
        </p>
      </div>

      <div class="wc-gallery-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} class="wc-gallery-placeholder">
            Stack {i + 1}
          </div>
        ))}
      </div>
    </div>
  );
}
