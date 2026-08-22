# 1.5.1 修复技术细节：Jellyfin Web 详情页音轨/字幕选择器

## 1. 问题

PureJellyfinShim 1.5.0 在 Jellyfin Web 10.11.11 详情页（`/web/index.html#/details?id=...`）作为投屏目标时，原本应该显示的三个下拉框（媒体版本、**音轨**、**字幕**）全部消失。用户无法在点击"播放"前预先选好音轨或字幕：

- 视频的音轨选择只能由服务端 `Play` 命令里附带的 `AudioStreamIndex` 决定，浏览器侧的选择面板用不上
- 字幕选择必须在 MPV 内通过快捷键手动切，体验远差于 jellyfin-mpv-shim

jellyfin-mpv-shim 在同样的页面下拉框都正常显示，差异只在 PJS 的 `Capabilities.SupportedCommands` 上。

## 2. 排查路径

在确认 `/Sessions` API 返回的 `NowPlayingItem.MediaStreams` 完整、PJS 本身 `SetAudioStreamIndex` / `SetSubtitleStreamIndex` 都已经声明的前提下，差异被定位到 jellyfin-web 的**详情页**控件门控，而不是播放器运行时。

## 3. 根因

### 3.1 详情页整个选择区被隐藏

`jellyfin-web@10.11.11/src/controllers/itemDetails/index.js` 的 `renderTrackSelections`：

```javascript
function renderTrackSelections(page, instance, item, forceReload) {
    const select = page.querySelector('.selectSource');

    if (!item.MediaSources
        || !itemHelper.supportsMediaSourceSelection(item)
        || playbackManager.getSupportedCommands().indexOf('PlayMediaSource') === -1
        || !playbackManager.canPlay(item)) {
        page.querySelector('.trackSelections').classList.add('hide');
        page.querySelector('.selectVideo').innerHTML = '';
        page.querySelector('.selectAudio').innerHTML = '';
        page.querySelector('.selectSubtitles').innerHTML = '';
        return;
    }

    // 否则渲染三个下拉框
    ...
}
```

`playbackManager.getSupportedCommands()` 返回**当前 active player** 的 `SupportedCommands`。当用户从详情页选了 PJS 作为 cast target 时，currentPlayer 切到 `SessionPlayer`（`isLocalPlayer: false`），`SupportedCommands` 就来自 PJS 的 `Capabilities.SupportedCommands`。

而 PJS 1.5.0 的 `SUPPORTED_REMOTE_COMMANDS` 是：

```rust
"Play", "Playstate", "SetVolume", "ToggleMute",
"ToggleFullscreen", "SetAudioStreamIndex", "SetSubtitleStreamIndex"
```

**没有 `PlayMediaSource`**。结果 `indexOf('PlayMediaSource') === -1` 命中，整个 `.trackSelections` 被 hide，下拉框跟着消失。

jellyfin-mpv-shim 的 `CAPABILITIES` 里 `SupportedCommands` 包含 `PlayMediaSource`（还有 `PlayNext`、`PlayTrailers` 等），所以命中不受影响。

### 3.2 `PlayMediaSource` vs `SetAudioStreamIndex` 容易混淆

PJS 之前已经声明了 `SetAudioStreamIndex` 和 `SetSubtitleStreamIndex`，看起来"切轨命令都有了，UI 应该显示才对"——这是直觉上的陷阱。

实际上：
- `SetAudioStreamIndex` / `SetSubtitleStreamIndex` 控制的是**点击切换按钮后**发送的命令
- `PlayMediaSource` 控制的是**能不能进入"选择 UI"**这件事本身

二者是**两道独立的门**，前一扇门没开，后一扇门开了也没用。

### 3.3 播放运行时 remote control 面板也会被门控

`jellyfin-web@10.11.11/src/components/remotecontrol/remotecontrol.js` 的 `updatePlayerState`：

```javascript
const isSupportedCommands = supportedCommands.includes('DisplayMessage')
    || supportedCommands.includes('SendString')
    || supportedCommands.includes('Select');

if (isSupportedCommands && !currentPlayer.isLocalPlayer) {
    context.querySelector('.remoteControlSection').classList.remove('hide');
} else {
    context.querySelector('.remoteControlSection').classList.add('hide');
}
```

里面包含的 `btnAudioTracks`（video/index.html 上的 `btnAudio`）、`btnSubtitles` 跟着整个 section 一起被 hide。这是第二道门，即使在播放器运行时也对 PJS 不友好。

## 4. 修复

`src-tauri/src/jellyfin/client.rs` 的 `SUPPORTED_REMOTE_COMMANDS` 加入缺失的命令：

```rust
const SUPPORTED_REMOTE_COMMANDS: &[&str] = &[
    "Play",
    "Playstate",
    "SetVolume",
    "ToggleMute",
    "ToggleFullscreen",
    "SetAudioStreamIndex",
    "SetSubtitleStreamIndex",
    // 详情页选择器需要的门控命令（renderTrackSelections 检查 PlayMediaSource）
    "PlayMediaSource",
    // 播放期间右侧 remote control 面板需要的门控命令
    "DisplayMessage",
    "SendString",
    "Select",
];
```

注意：
- 这些都是**声明性**的，PJS 并不真的实现 `DisplayMessage` / `SendString` 等文本遥控命令；它们的作用只是让 jellyfin-web 把相应的 UI 容器渲染出来
- PJS 实际处理过的命令仍然是 `Play` / `Playstate` / `SetVolume` / `ToggleMute` / `ToggleFullscreen` / `SetAudioStreamIndex` / `SetSubtitleStreamIndex` 这几条；其他命令收到会被忽略
- 改成 PJS 实现也接收 `PlayMediaSource` 之类的命令不会影响 cast 行为，因为 jellyfin-mpv-shim 也是这么干的

## 5. 验证

环境：
- Jellyfin Server 10.11.11
- Jellyfin Web 10.11.11（默认 stable app）
- PureJellyfinShim 1.5.1

测试步骤：
1. 启动 PJS，确认 `/Sessions` 里 PJS 的 `Capabilities.SupportedCommands` 包含 `PlayMediaSource`
2. 在浏览器打开任意视频详情页
3. 点 PureJellyfinShim 作为播放目标
4. 媒体版本 / 音轨 / 字幕三个下拉框全部出现（之前完全消失）
5. 选中音轨和字幕后点"播放"，`/Sessions/{id}/Playing` 的请求 body 里能见到 `AudioStreamIndex` 和 `SubtitleStreamIndex`
6. PJS 收到 Play 命令后用对应 index 启动 MPV，行为与手选一致

## 6. 延伸：jellyfin-web 其他可能踩到的同类门控

| 容器 / UI | 关键检查 | 文件 |
|---|---|---|
| `.trackSelections`（详情页音轨 / 字幕 / 媒体版本） | `PlayMediaSource` in SupportedCommands | `controllers/itemDetails/index.js` |
| `.remoteControlSection`（播放器右侧整块，含 btnAudioTracks / btnSubtitles） | `DisplayMessage`/`SendString`/`Select` 任一 in SupportedCommands 且 `!isLocalPlayer` | `components/remotecontrol/remotecontrol.js` |
| `.btnAudio` / `.btnSubtitles`（播放器 OSD） | `audioTracks.length > 1`（audio） / `subtitleTracks.length > 0`（subtitle） | `controllers/playback/video/index.js` |

调试 cast target 在 Jellyfin Web 上某个 UI 不显示时，先按上表确认是哪一层门没开，再去改 PJS 的 `SupportedCommands` 声明或 `Capabilities` 上报。

## 7. 后续如果升级 jellyfin-web

1. jellyfin-web 大版本里 `renderTrackSelections` 的判断条件可能改名或换字段名，但只要它仍以"remote cast target 的某个 capability 子集"作为门控，思路不变——查那个函数里的 `if (...)` 链
2. 同样的，`remotecontrol.js` 的 `isSupportedCommands` 三个 key 任一被改也是同一种模式
3. 升级到 jellyfin-web 的新 stable 后，先打开一个详情页对一个多音轨视频做 cast，验证三个下拉框还在，再考虑后续