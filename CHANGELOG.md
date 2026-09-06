# Changelog

All notable changes to JellyPilot are documented in this file.

## [1.5.7] - 2026-09-07

### Fixed
- **MV（音乐视频）现在能正常弹出 MPV 窗口**：之前 `is_video_item` 只匹配 `Movie` / `Episode` / `Video` / `Series`，把 Jellyfin 的 `MusicVideo` 类型当作音频处理，导致投屏 MV 时只放音频不开窗口（和纯音乐一样 `vid=no`）。`MusicVideo` 是音乐库里带视频的 track，按定义就是视频内容，理应跟电影一样走视频窗口。把它加进匹配列表后，`raise_mpv_window` 触发，`MpvAction::Play` 走 `vid=auto` 而不是 `vid=no`，MP→MV 切换会正确触发 MPV 重启，MV→MV 切换复用现有 MPV 进程。

## [1.5.6] - 2026-09-04

### Fixed
- **音频↔视频切换后 web 端控制条消失 / 进度条不同步**：`handle_play` 在 commit 新会话到 state 之后才发 `MpvAction::Stop`，导致旧 MPV 被杀后 listener 的 channel-close cleanup 走 `report_playback_stopped` 路径，`s.playback.take()` 静默把新会话从 state 里取走。之后新 MPV 的 `seek` / `property-change` 事件全部因 `state.playback == None` 被静默丢弃，jellyfin-web 看到的 NowPlayingItem 永远停在旧位置、并且常常显示旧 item 的播放条。新增 `SessionState::playback_setup_at` 时间戳：`handle_play` commit 新会话时打戳，listener cleanup 在 `<5s` 内识别为"计划内 audio↔video 重启"直接跳过清理（避免破坏新会话），超过 5s 或为 `None` 走原来的清理路径（处理非预期 MPV 退出）。listener 成功绑定到新 IPC 后清空该时间戳，避免误吞后续真实的退出信号。
- **关闭 MPV 窗口后 jellyfin-web 控制条不消失**：`TransportSnapshot::clear()` 之前等价于 `*self = Self::default()`，但 `Default` 派生对 bool 字段是 `false`，而 `PlayerState::default` 的 `connected` 也未显式标 `false`，整个清理路径依赖"重置整个 struct"的副作用。改成显式 `self.player.connected = false` 并 `self.player.paused = true`，停止流程里 `emit_now_playing_changed` 拿到的状态一定反映"已断开、暂停"。
- **重复 `report_playback_stopped` 误吞新会话**：`handle_play` 在写入新会话到 state 之后又调了一次 `report_playback_stopped`（仅 audio↔video 分支），意图是"切类型时让 jellyfin-web 看到旧 session 已停"。但此时 `state.playback` 已经是新会话，`take()` 把它拿走。该调用是冗余的——上面的通用 stop-before-start 已经处理过旧会话。整块删除，避免和新会话的 commit 顺序竞争。
- **MP3/FLAC 等音频文件播放时 MPV 也开窗**：`MpvClient::start()` 之前从不发 `vid=no`，音频若带封面 art 就会创建窗口，最小化后切下一首时 MPV 重新开窗进入"完全隐藏"状态。`MpvAction::Play` 加 `is_audio` 字段，executor 在 `loadfile` 前根据它 `set_property vid no`（音频）或 `vid auto`（视频），覆盖之前音频留下的 `vid=no`。

### Maintenance
- 同步把 `src-tauri/Cargo.toml`（Jellyfin 看到的 `CLIENT_VERSION`，由 `env!("CARGO_PKG_VERSION")` 注入）从 1.5.4 升到 1.5.6——之前漏更新，服务器侧一直显示旧版本号。`tauri.conf.json` 和 `package.json` 同步。

## [1.5.5] - 2026-09-04

### Fixed
- **恢复自动播放下一首**：之前为了修窗口显示问题把 MPV 切到 `keep-open=always`，但这会让 MPV 在自然结束时不再发送 `end-file` 事件，自动连播（音乐下一首、剧集下一集）全部失效。改回 `keep-open=no`，自然结束 → `end-file` → `play_adjacent_episode` → 自动连播恢复。
- **修复视频→视频每次都重启 MPV**：`session.rs` 之前对所有视频播放都强制重启 MPV，导致视频→视频连续播放时窗口一闪一闪。新增 `SessionState::previous_item_type` 字段记录上一项的类型，只有 audio↔video 切换才重启 MPV，同类型切换（audio→audio、video→video）复用现有 MPV 进程。该字段特意不被 `clear_playback_context` 清掉，所以即便 jellyfin-web 发了 Stop+Play 序列，下一次播放仍能正确判断上一项类型。
- **jellyfin-web 拖动进度条/暂停立即同步**（web→MPV）：之前拖动进度条时，PJS 只更新本地状态但不立即告诉服务器，jellyfin-web 轮询看到的是旧位置，进度条会"弹回"再跳到拖动位置。修复双管齐下：（1）新增 `report_progress_at(client, state, position_ticks)`，不读 state里的实时位置（防止被 MPV 的旧 time-pos 事件覆盖），直接用用户拖动的目标位置上报；（2）Seek 后强制 `last_report_time = NOW`（不是绕过节流），让后续 5 秒内的旧 time-pos 事件被压制，避免覆盖 jellyfin-web。Pause/Unpause/PlayPause 也走同样路径。
- **MPV 端跳转立即同步到 jellyfin-web**（MPV→web）：之前完全没监听 MPV 的 `seek` 事件，依赖 5 秒定期 progress 报告节流窗口。从 MPV 窗口拖动进度条、键盘跳转、OSD 跳转后，jellyfin-web 要等最多 5 秒才看到新位置。现在在 MPV `seek` 事件处理器里查询 MPV 的实际 `time-pos`、更新 state、立即 `report_progress` 到 Jellyfin。
- **音频（含封面）不再创建 MPV 窗口**：之前音频文件若带有封面（很多 flac/mp3 专辑都有），MPV 会创建一个显示封面的窗口。最小化窗口后自动切下一首时，MPV 重新创建窗口时进入"完全隐藏"的诡异状态。给 `MpvAction::Play` 加 `is_audio` 标志，executor 在 `loadfile` 前根据它设置 `vid=no`（音频）或 `vid=auto`（视频），从此音频文件无论有没有封面都纯后台播放，没有窗口；视频则恢复默认的视频输出，覆盖之前音频留下的 `vid=no`。

### Maintenance
- 删除 `MpvClient::play_via_playlist` 和 `MpvClient::enqueue_and_play` 两个 dead code 方法（之前尝试用 playlist API 切歌失败后废弃）。
- 删除 `MpvCommand::playlist_add/clear/play_index/remove_index` 和 `MpvCommand::unobserve_property`，上层已不再使用。
- 删除 `MpvClient::get_playlist_count`（dead code）。
- 删除根目录遗留的 0 字节 `nul` 文件。
- 清理调试日志：`Reporting progress` 从 INFO 降到 DEBUG（每 5 秒一次太频繁）。

## [1.5.4] - 2026-08-31

### Fixed
- **兼容 Jellyfin 12**：适配 Jellyfin 12 的认证变更，修复登录问题。Jellyfin 12 禁用旧版 `X-Emby-Authorization` 头和 `api_key` 查询参数，改为标准 `Authorization` 头和 `ApiKey` 参数；同时移除登录请求中的多余 `App` 字段。

## [1.5.3] - 2026-08-24

### Fixed
- **音量调整路径全覆盖**：之前只有 PJS UI 的 `mpv_set_volume` Tauri 命令会更新内存中的 `config.volume` 和 MPV 种子音量 `initial_volume`。web 端的 `GeneralCommand::SetVolume` 和 MPV 自身（键盘/OSD/外部客户端）触发的 `property-change` 事件完全没碰这两个值，所以走这两条路径调音量的人，音量永远不会被 PJS 记住，关闭 PJS 后写盘的也是旧值（典型症状：用户从 87 调到 60 后关闭再开又是 87）。现在 web 端 SetVolume 处理函数和事件监听器 `update_state_from_property` 收到 `volume` 变化时，都会同步三处：`session.volume`（上报 Jellyfin）、`config.volume`（退出时写盘）、`MpvClient::initial_volume`（MPV 冷启动时应用）。
- **`mpv_set_volume` 写入顺序修复**：之前 `state.set_volume(MPV).await` 先执行，失败就 `?` 返回，导致后面的 `config.volume = volume` 和 `set_initial_volume` 被全部跳过。MPV 关闭或 IPC 瞬时错误时音量会被静默丢弃，`config.volume` 卡在启动加载时的旧值。三处更新无条件放在最前面，MPV 推送改成 best-effort（失败仅记录 warning）。
- **MPV 冷启动时种子音量的可靠应用**：`MpvClient::start()` 之前只发一次 `set_property volume`，MPV 刚启动时 IPC server 可能还没完全 ready，第一次命令被丢弃，MPV 保持 mpv.conf 的默认音量。修复后增加三道保险：记 `seed_volume` 日志、失败 150ms 后重试一次、发完读回实际音量验证（差距 >0.5 再补一次）。
- **删除 `on_after_play` hook 覆盖 `initial_volume` 的副作用**：原 hook 在播放后读 MPV 音量回写到 `initial_volume`，但 `tokio::spawn` 异步执行和 `set_property volume` 命令生效之间存在时序竞争，会读到中间状态覆盖用户的选择。改成 no-op，`initial_volume` 只在用户调音量时设置，干净无污染。
- **退出 PJS 时音量写盘错误日志化**：`lib.rs` 的退出处理器之前用 `let _ = store.save()` 吞掉了错误，现在区分打开 store 失败和 save 失败，分别记 error 并提示 "volume NOT persisted!"。

### Changed
- **MPV IPC 事件通道容量从 100 扩到 1000**：MPV 的 `time-pos` 事件约 60Hz，原 100 的容量会频繁触发 "Event channel full, dropping event"，导致音量/进度/暂停事件被丢弃。

### Maintenance
- 删除未使用的 `MpvClient::disconnect()` 方法（`is_connected()` 已经做了同样的清理）。
- `MpvClient::set_volume` 失败时记 error 而不是吞错。
- 新增 `SessionState::set_playback_volume` 让 web 路径也能同步 session.volume。

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
