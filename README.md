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

构建产物：`src-tauri/target/release/bundle/nsis/PureJellyfinShim_1.5.1_x64-setup.exe`

## v1.5.1 更新

- **修复 Jellyfin Web 详情页音轨/字幕选择器**：投屏到 PureJellyfinShim 时，详情页原本应该显示的"音轨/字幕/媒体版本"下拉框全部消失的问题已修复，现在可以像 jellyfin-mpv-shim 一样在投屏前预先选择音轨和字幕。详细技术分析见 [`notice.md`](notice.md)。

## 技术栈

Tauri v2 + Solid.js + Rust + Panda CSS

## License

MIT
