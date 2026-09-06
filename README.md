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

构建产物：`src-tauri/target/release/bundle/nsis/PureJellyfinShim_1.5.7_x64-setup.exe`

## v1.5.7 更新

- **MV（音乐视频）现在能正常弹出 MPV 窗口**：之前投屏 MV（音乐库里的带视频曲目）的时候跟纯音乐一样只放音频不开窗口，看起来"无声无息"。这一版把 `MusicVideo` 类型正确归到视频，投屏 MV 现在会正常弹出 MPV 视频窗口，audio↔MV 切换也会触发 MPV 重启拿到一个干净的窗口。

## v1.5.6 更新

这一版集中修了一批投屏体验上最影响心情的"小毛病"：

- **音频 ↔ 视频之间切换，控制条不会消失了**：之前从音频切到视频（或反过来）的时候，jellyfin-web 端的播放控制条要么直接消失，要么卡在旧位置不同步。这一版修复了状态在切换瞬间被错误清掉的根本问题，audio/video 之间互切现在控制条正常出现，进度条也能跟着 MPV 实时同步。
- **关闭 MPV 窗口后控制条能正确消失**：之前手动关掉 MPV 窗口后，web 端的控制条还停在那里，状态没清干净。现在关掉 MPV 后控制条会立刻反映"已断开"，不会再出现"我明明关了它还在跑"的诡异感觉。
- **修复之前漏更新的版本号**：之前版本号只改了前端和 Tauri 配置，Rust crate 的版本号没同步，导致 Jellyfin 服务器侧看到的客户端版本一直停留在 1.5.4。本次一并修正，服务器侧现在会正确显示 1.5.6。

## v1.5.5 更新

这一版主要解决了上一版（1.5.4）回归的几个投屏体验问题，并打磨了 MPV 双向同步：

- **自动播放下一首恢复正常**：之前在切歌/切剧集时会停在最后一首上，现在音乐专辑能按顺序播完整张，剧集也能自动连播下一集。
- **连续播放视频不再闪屏**：之前连续播两个视频时 MPV 窗口会一闪一闪地重启，现在复用同一个 MPV 进程，切换更平滑。
- **音乐播放不再弹出封面窗口**：之前带封面的音乐文件（如 flac、专辑图）会弹出一个显示封面的 MPV 窗口。现在所有音频文件统一纯后台播放，无论有没有封面都不会有窗口，视频文件照常开窗。
- **jellyfin-web 与 MPV 双向进度条/暂停立即同步**：之前从 web 端拖进度条或暂停时，jellyfin-web 经常要等几秒甚至"弹回"原位。现在双向都接近实时——在 web 端拖动进度条、MPV 窗口拖动进度条、键盘跳转、OSD 跳转，UI 都能即时同步。

## v1.5.4 更新

- **兼容 Jellyfin 12**：适配 Jellyfin 12 的认证变更，修复登录问题。Jellyfin 12 禁用旧版 `X-Emby-Authorization` 头和 `api_key` 查询参数，改为标准 `Authorization` 头和 `ApiKey` 参数；同时移除登录请求中的多余 `App` 字段。

## v1.5.3 更新

- 修复音量同步问题：用户调整音量后退出 PJS，下次再启动时音量会被错误恢复到旧值（比如历史记录里的 87），且某些场景下音量调整完全没写入内存。覆盖了所有调音量路径（UI / web 端 SetVolume / MPV 端 OSD 和快捷键），关闭 PJS 时正确写盘。

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
