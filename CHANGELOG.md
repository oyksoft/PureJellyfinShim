# Changelog

All notable changes to JellyPilot are documented in this file.

## [1.5.2] - 2026-08-22

### Added
- **多 ItemIds 队列播放**：仿 jellyfin-mpv-shim 的 `Media` 类，在端上自己维护 `current_queue` + `index`。Jellyfin Web 投屏包含多个 ItemIds 的音乐专辑或视频时按顺序播完整列；MPV 端上每次只播一首，end-file 后从队列取下一首重新走 `handle_play` 流程。TV 剧集自动连播仍然保留作为 fallback。
- **视频 cast 自动 raise MPV 窗口**：仿 jMS `win_utils.raise_mpv`，通过 PID 找 MPV 主窗口，依次 `AllowSetForegroundWindow` → `SetForegroundWindow` → `ShowWindow` minimize/restore → `BringWindowToTop` 兜底。视频 cast 时自动弹窗；音乐不弹窗（避免切歌打断）。
- **手动暂停后 cast 继续播放**：`MpvAction::Play` 在 `loadfile` 完成后才发 `set_property pause no`，避免在空 decoder 上 unpause 引发 audio click。

### Removed
- **高级 MPV 选项** UI 和后端配置。之前的文本输入框有 bug（设置后自动折叠且下次不可展开），且对绝大多数用户没用。额外的 MPV 参数请在 `mpv.conf` 里配置。

## [1.5.1] - 2026-08-22

### Fixed
- Jellyfin Web 10.11.11 item-details 页面：投屏到 PureJellyfinShim 时，音轨/字幕/媒体版本选择器全部隐藏，无法在投屏前预先选择。根因是 jellyfin-web 的 `renderTrackSelections` 检查 `SupportedCommands` 是否包含 `PlayMediaSource` —— 缺失则隐藏整个 `.trackSelections` 容器。修复：在 `SUPPORTED_REMOTE_COMMANDS` 中加入 `PlayMediaSource`（以及 `DisplayMessage`/`SendString`/`Select`，让右侧 remote control 面板也能显示）。

## [1.5.0] - 2026-08-19

### Added
- 完整库浏览体验：resume-first 首页、电影感 hero、侧边栏搜索
- 重新设计的媒体详情页
- 本地代理背后基于 origin-encoded SQLite 的 artwork 缓存
- 磁盘支持的 Emby HLS 代理

## [1.4.2] - 2026-07-23

### Added
- Emby media server support: login, library browsing, playback, and progress reporting through a provider-neutral session facade.
- Collapsible sidebar with persisted preference and compositor-animated FLIP transitions.
- Virtualized large browse grids with prefetched paging and persisted filter state.
- Redesigned item detail pages for desktop with back navigation and scroll restore.
- Disk-cached artwork scoped to the active service connection.
- Saved service profile switching.
- AUR package (`jellypilot`) for Arch Linux source-built installation.

### Changed
- Completed full Panda CSS styling cutover across all application surfaces, replacing vanilla-extract and utility bridges.
- Replaced floating controls with a persistent sidebar.
- Migrated data flows to solid-query with structured Effect Exit boundaries.
- Upgraded to TypeScript 7.

### Fixed
- Cleared closed MPV IPC connections to prevent stale socket references.
- Decoupled artwork loading from data fetches to avoid layout churn.
- Stabilized browse card layout and corrected virtual grid row height estimates.
- Redirected stale browse routes on server change and avoided reload churn.
- Kept tall service dialog content reachable and fixed Settings modal nesting.
- Fixed Windows CI race condition in release workflow (`bun install --ignore-scripts`).

### Maintenance
- Added rsdoctor build diagnostics.
- Added isolated native WebDriver E2E harness and Tauri parity evidence workflow.
- Consolidated agent documentation and Effect rules into docs/agents/.

## [1.4.1] - 2026-06-21

### Added
- Media info hover-cards for detailed movie and series views.
- Playback stream selection and episodes-first series detail page hierarchy.
- Manual MPV skip prompt for the Intro Skipper integration.

### Changed
- Redesigned the application frontend with sticky segment group navbars, horizontal header layouts, and modern layout spacing.
- Migrated navigation and layout architecture to TanStack Router file-based nested routing.
- Adopted vanilla-extract for design tokens and component-specific styling.
- Migrated playback controls to a clean header drawer and consolidated search filters and sort controls using Ark UI Menu and Toggle.

### Fixed
- Aligned browse filter-error mock to resolve backend error code mismatches.
- Fixed aspect ratios for library home cards to match active category rows.
- Resolved type boundaries and error handling for operations console, quick connect, and password command failures using Effect.

### Maintenance
- Migrated from Biome to Oxc linting/formatting and updated Tailwind to Rsbuild plugin integration.
- Migrated library data workflows to structured, typed Effect Exit results.
- Configured local release note reader workflow to replace git-cliff.
- Updated default episode switching keyboard shortcuts to `Shift+>` and `Shift+<` and moved shortcuts display to the right panel.

[1.4.2]: https://github.com/hewel/jellypilot/compare/v1.4.1...v1.4.2
[1.4.1]: https://github.com/hewel/jellypilot/compare/v1.4.0...v1.4.1
