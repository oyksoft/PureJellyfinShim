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

构建产物：`src-tauri/target/release/bundle/nsis/PureJellyfinShim_1.5.2_x64-setup.exe`

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
