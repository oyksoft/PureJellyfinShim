use std::collections::HashMap;

pub fn get_tray_labels(locale: &str) -> HashMap<&'static str, &'static str> {
  let mut m = HashMap::new();

  if locale == "zh" {
    m.insert("play_pause", "播放/暂停");
    m.insert("next", "下一集");
    m.insert("previous", "上一集");
    m.insert("mute", "静音");
    m.insert("show_console", "显示操作台");
    m.insert("quit", "退出");
    m.insert("tooltip", "PureJellyfinShim");
  } else {
    m.insert("play_pause", "Play/Pause");
    m.insert("next", "Next");
    m.insert("previous", "Previous");
    m.insert("mute", "Mute");
    m.insert("show_console", "Show Operations Console");
    m.insert("quit", "Quit");
    m.insert("tooltip", "PureJellyfinShim");
  }

  m
}
