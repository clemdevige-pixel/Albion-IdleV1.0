# Timeline UI assets

Place the extracted timeline PNG assets in this directory.

Expected files:
- `timeline_node_normal.png`
- `timeline_node_active.png`
- `timeline_node_complete.png`
- `timeline_node_boss.png`
- `timeline_connector_full.png`
- `timeline_connector_tile.png`
- `timeline_arrow_left.png`
- `timeline_arrow_right.png`

Integration target: `WorldSegmentStrip`.

Notes:
- Keep RGBA transparency.
- Do not resize before integration.
- `timeline_connector_tile.png` is the preferred source for the responsive rail.
- Glow/hover/locked states should remain CSS-driven where possible.
