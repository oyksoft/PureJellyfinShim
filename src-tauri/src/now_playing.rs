//! Minimal now_playing stub for playback state without library browsing.
//!
//! This module provides the minimal types needed by session.rs and playback_control.rs
//! without the full library browsing integration.

use crate::command::{NowPlayingState, NowPlayingStatus, PlayerState};

/// Shared playback context for now playing projection.
#[allow(dead_code)]
#[derive(Debug, Clone)]
pub struct PlaybackContext<'a> {
  pub has_active_session: bool,
  pub current_item: Option<&'a crate::jellyfin::MediaItem>,
}

/// Minimal transport snapshot for playback state.
#[derive(Debug, Clone, Default)]
pub struct TransportSnapshot {
  player: PlayerState,
  pause: Option<bool>,
  mute: Option<bool>,
  /// MPV `volume` (0-100), observed via the `property-change` event loop.
  /// Held here so the web UI's NowPlaying volume stays in sync with MPV
  /// when the user adjusts via the OSD or keybindings (which never
  /// round-trip through `mpv_set_volume`).
  pub(super) volume: Option<f64>,
}

impl TransportSnapshot {
  pub fn muted(&self) -> bool {
    self.mute.unwrap_or(false)
  }

  pub fn mark_connected(&mut self) {
    self.player.connected = true;
  }

  pub fn clear(&mut self) {
    self.player.connected = false;
    self.player.paused = true;
    self.pause = Some(true);
    self.mute = Some(false);
    self.volume = None;
  }

  pub fn reset_for_new_session(&mut self, _position_seconds: f64) {
    self.player.connected = true;
    self.player.paused = true;
    self.pause = Some(true);
  }

  pub fn apply_property(&mut self, name: &str, value: &serde_json::Value) {
    match name {
      "pause" => {
        self.pause = value.as_bool();
        self.player.paused = value.as_bool().unwrap_or(false);
      }
      "mute" => {
        self.mute = value.as_bool();
        self.player.muted = value.as_bool().unwrap_or(false);
      }
      "volume" => {
        if let Some(v) = value.as_f64() {
          self.volume = Some(v);
          self.player.volume = v;
        }
      }
      _ => {}
    }
  }

  pub fn project(&self, media_runtime_seconds: Option<f64>) -> PlayerState {
    let mut player = self.player.clone();
    if let Some(v) = self.volume {
      player.volume = v;
    }
    if player.duration <= 0.0 {
      player.duration = media_runtime_seconds.unwrap_or(0.0);
    }
    player
  }
}

/// Build now playing state from player and playback context.
pub fn build_now_playing_state(
  player: PlayerState,
  _context: PlaybackContext<'_>,
) -> NowPlayingState {
  let status = if player.connected {
    if player.paused {
      NowPlayingStatus::Paused
    } else {
      NowPlayingStatus::Playing
    }
  } else {
    NowPlayingStatus::Idle
  };

  NowPlayingState {
    status,
    player,
    media: None,
    can_play_next: false,
    can_play_previous: false,
    next_unavailable_reason: None,
    previous_unavailable_reason: None,
  }
}

/// Collect current player state from MPV.
pub async fn collect_player_state(mpv: &crate::mpv::MpvClient) -> PlayerState {
  let connected = mpv.is_connected();
  let (paused, muted, volume, time_pos, duration) = if connected {
    let paused = mpv.get_pause().await.unwrap_or(false);
    let muted = mpv.get_mute().await.unwrap_or(false);
    let volume = mpv.get_volume().await.unwrap_or(100.0);
    let time_pos = mpv.get_time_pos().await.unwrap_or(0.0);
    let duration = match mpv.get_property("duration").await {
      Ok(crate::mpv::PropertyValue::Number(n)) => n,
      _ => 0.0,
    };
    (paused, muted, volume, time_pos, duration)
  } else {
    (false, false, 100.0, 0.0, 0.0)
  };

  PlayerState {
    connected,
    paused,
    muted,
    volume,
    time_pos,
    duration,
  }
}
