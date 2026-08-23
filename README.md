# PureJellyfinShim

Fork 自 [JellyPilot](https://github.com/hewel/jellypilot)，改造为更纯粹的 Jellyfin/Emby 投屏接收端。

## 与上游的差异

- **去掉库浏览**：PureJellyfinShim 不内置库浏览功能，纯粹作为 Jellyfin/Emby 的投屏目标使用
- **界面语言**：中文为主，支持英文
- **安装包**：仅 NSIS（中/英双语）

## 功能

| 功能 | 说明 |
|------|------|
| Jellyfin / Emby 投屏 | 作为投屏目标出现在 Jellyfin/Emby 客户端中 |
| 外部 MPV | 通过 JSON IPC 控制 MPV，保留用户原有配置 |
| 自动续播 | 自动播放下一集 |
| Intro Skipper | 支持 Jellyfin Intro Skipper 插件 |
| 系统托盘 | 最小化到托盘，支持多语言菜单 |
| 单实例 | 防止重复启动 |

## 系统要求

- Windows 10/11（x64）
- [MPV](https://mpv.io/) 已安装并加入 PATH
- WebView2 运行时

## 安装

**[下载地址](https://github.com/oyksoft/PureJellyfinShim/releases)**

安装时自动检测系统语言——中文系统默认简中，英文系统默认英文。

## 从源码构建

```bash
bun install
bun tauri build
```

构建产物：`src-tauri/target/release/bundle/nsis/PureJellyfinShim_1.5.3_x64-setup.exe`

## v1.5.3 更新

- **修复音量同步和持久化（核心修复）**：之前用户调整音量后退出 PJS，下次启动时会被还原为错误的历史值（典型情况：用户从 87 调到 60，关闭再开又是 87），且部分路径下音量完全没写入内存。根因是 `config.volume` 和 `MpvClient::initial_volume` 的更新只走 PJS UI 的 `mpv_set_volume` Tauri 命令一条路径——web 端的 `GeneralCommand::SetVolume` 和 MPV 自身（键盘/OSD/外部客户端）的 `property-change` 事件完全没碰这两个值。现在三条路径（UI / web / MPV 自身）都会同步更新 `session.volume`（上报 Jellyfin）+ `config.volume`（退出时写盘）+ `initial_volume`（MPV冷启动时应用）。
- **`mpv_set_volume` 写入顺序修复**：之前 `state.set_volume(MPV).await` 先执行，失败就 `?` 返回，导致后面的内存更新被全部跳过。MPV 关闭或 IPC 瞬时错误时音量会被静默丢弃。现在三处更新无条件放在最前面，MPV 推送改成 best-effort。
- **MPV 冷启动时种子音量的可靠应用**：之前 `start()` 只发一次 `set_property volume`，MPV 刚启动时 IPC server 还没完全 ready，命令被丢弃，MPV 保持 mpv.conf 默认音量（`volume=87` 就是用户反复看到的幽灵值）。现在记日志 + 失败 150ms 重试 + 读回实际音量验证（差距 >0.5 再补一次），日志里能看到 `Applied initial volume {} to MPV` / `verified MPV volume = {}`。
- **删除 `on_after_play` hook 覆盖 `initial_volume` 的副作用**：该 hook 在播放后读 MPV 音量回写种子音量，但 `tokio::spawn` 异步执行和 `set_property volume` 命令生效之间存在时序竞争，会读到中间状态。改成 no-op，`initial_volume` 只在用户调音量时设置。
- **退出 PJS 写盘错误日志化**：之前 `let _ = store.save()` 吞掉错误，现在区分打开 store 失败和 save 失败，分别记 error 并明确提示 "volume NOT persisted!"。

清理：删除未使用的 `MpvClient::disconnect()` 方法；MPV IPC 事件通道从 100 扩到 1000（避免 `time-pos` 60Hz 把通道填满、丢失音量/进度/暂停事件）。

## v1.5.2 更新

- **音乐 / 视频队列自动播放**：纯播放单个视频/音频时正常，但以前用 Jellyfin Web 投屏包含多个 ItemIds 的音乐专辑或剧集时只会播第一首（其他被忽略），且自动播放下一首的逻辑只对 TV Episode 工作。现在完整接收 `ItemIds` 列表并在端上自己维护播放队列——音乐专辑按顺序播完整张，剧集自动连播下一集。
- **cast 视频时 MPV 窗口自动弹到前台**：仿 jellyfin-mpv-shim 的 `win_utils.raise_mpv`，PJS 在视频播完之后把 MPV 窗口提到最前面。音乐不弹窗（避免每首歌都打断用户），但暂停时切换会**自动取消暂停**继续播放新内容（视频和音频都一样）。
- **移除"高级 MPV 选项"设置项**：之前的 UI 输入框有个 bug——设置后会自动保存，导致下次设置页无法展开。直接砍掉这个功能，MPV 额外的参数让用户自己写在 `mpv.conf` 里更稳。

## v1.5.1 更新

- **修复 Jellyfin Web 详情页音轨/字幕选择器**：投屏到 PureJellyfinShim 时，详情页原本应该显示的"音轨/字幕/媒体版本"下拉框全部消失的问题已修复，现在可以像 jellyfin-mpv-shim 一样在投屏前预先选择音轨和字幕。详细技术分析见 [`notice.md`](notice.md)。

## 技术栈

Tauri v2 + Solid.js + Rust + Panda CSS

## License

MIT
