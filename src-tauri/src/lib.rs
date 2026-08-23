#![allow(linker_messages)]

use std::path::PathBuf;
use std::sync::Arc;

mod auth_profiles;
mod command;
mod config;
mod hls_proxy;
mod jellyfin;
mod mpv;
mod now_playing;
mod playback_control;
mod tray;
mod tray_i18n;

use command::{ConfigState, JellyfinState, MpvState};
pub use config::{AppConfig, Locale};
use hls_proxy::{HlsProxy, HlsProxyState};
use jellyfin::JellyfinClient;
use mpv::MpvClient;
use parking_lot::RwLock;
use tauri::{Manager, WindowEvent};
use tauri_plugin_log::{Target, TargetKind};

#[cfg(all(feature = "webdriver", not(debug_assertions)))]
compile_error!("PUREJELLYFINSHIM_WEBDRIVER_REQUIRES_DEBUG_ASSERTIONS");

fn logging_plugin() -> tauri::plugin::TauriPlugin<tauri::Wry> {
  tauri_plugin_log::Builder::default()
    .level(log::LevelFilter::Info)
    .targets([
      Target::new(TargetKind::Stdout),
      Target::new(TargetKind::Webview),
    ])
    .build()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let builder = command::specta_builder();

  // Create config state with defaults (will be updated in setup after store is available)
  let config = Arc::new(RwLock::new(AppConfig::default()));
  let config_state = ConfigState(config.clone());
  let config_for_setup = config.clone();
  let hls_proxy_state = HlsProxyState::default();
  let hls_proxy_for_setup = hls_proxy_state.clone();

  // Create MPV client state
  let mpv_client = Arc::new(MpvClient::new(None));
  let mpv_state = MpvState(mpv_client.clone());
  let mpv_for_setup = mpv_client.clone();

  // Create Jellyfin client state
  let jellyfin_client = Arc::new(JellyfinClient::new());
  let jellyfin_for_setup = jellyfin_client.clone();
  let jellyfin_state = JellyfinState::new(jellyfin_client, mpv_client, hls_proxy_state);

  let app_builder = tauri::Builder::default()
    .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
      // Bring existing window to front when user launches a second instance
      if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
      }
    }))
    .manage(config_state)
    .manage(mpv_state)
    .manage(jellyfin_state)
    .invoke_handler(builder.invoke_handler())
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_store::Builder::new().build());

  #[cfg(feature = "webdriver")]
  let app_builder = app_builder
    .plugin(logging_plugin())
    .plugin(tauri_plugin_wdio::init())
    .plugin(tauri_plugin_wdio_webdriver::init());

  app_builder
    .setup(move |app| {
      #[cfg(not(feature = "webdriver"))]
      app.handle().plugin(logging_plugin())?;

      // Load config from disk (store plugin is now available)
      let loaded_config = command::load_config_from_store(app.handle());
      match app.path().app_cache_dir() {
        Ok(cache_dir) => {
          mpv_for_setup.set_demuxer_cache_dir(cache_dir.clone());
          hls_proxy_for_setup.install(HlsProxy::start(Some(cache_dir.join("hls"))));
        }
        Err(e) => {
          log::warn!(
            "Failed to resolve app cache directory for media caches: {}",
            e
          );
          hls_proxy_for_setup.install(HlsProxy::start(None));
        }
      }

      // Apply loaded config to MPV client
      let mpv_path = loaded_config
        .mpv_path
        .as_ref()
        .filter(|s| !s.is_empty())
        .map(PathBuf::from);
      mpv_for_setup.set_mpv_path(mpv_path);
      // Seed the next MPV start with the user's last-set volume so a fresh
      // mpv.exe process does not snap back to the mpv.conf default. This
      // runs once at PJS startup; `on_mpv_disconnect` updates the seed
      // after the user changes volume mid-session, so this read is the
      // starting point for the first play after a PJS restart.
      mpv_for_setup.set_initial_volume(Some(loaded_config.volume));

      // Apply loaded config to Jellyfin client
      jellyfin_for_setup.set_device_name(loaded_config.device_name.clone());

      // Store config in state
      *config_for_setup.write() = loaded_config.clone();

      // Show main window unless start_minimized is set
      if !loaded_config.start_minimized {
        if let Some(window) = app.get_webview_window("main") {
          let _ = window.show();
          let _ = window.set_focus();
        }
      }

      // Setup system tray
      let locale_str = match loaded_config.locale {
        config::Locale::Zh => "zh",
        config::Locale::En => "en",
        config::Locale::Auto => {
          // Detect Windows system locale via FFI to GetUserDefaultLCID
          #[cfg(target_os = "windows")]
          {
            #[link(name = "kernel32")]
            extern "system" {
              fn GetUserDefaultLCID() -> u32;
            }
            let lcid = unsafe { GetUserDefaultLCID() };
            // LCID for Chinese locales: 0x0004 (LANG_CHINESE) primary lang
            // Sublanguages: 0x0001 (SIMPLIFIED_CHINESE), 0x0002 (TRADITIONAL_CHINESE)
            let primary_lang = lcid & 0x3FF;
            if primary_lang == 0x04 {
              "zh"
            } else {
              "en"
            }
          }
          #[cfg(not(target_os = "windows"))]
          {
            std::env::var("LANG")
              .or_else(|_| std::env::var("LC_ALL"))
              .or_else(|_| std::env::var("LC_MESSAGES"))
              .map(|v| if v.starts_with("zh") { "zh" } else { "en" })
              .unwrap_or("en")
          }
        }
      };
      if let Err(e) = tray::setup_tray(app.handle(), locale_str) {
        log::error!("Failed to setup system tray: {}", e);
      }

      builder.mount_events(app);
      Ok(())
    })
    .on_window_event(|window, event| {
      // Hide window to tray on close instead of quitting
      if let WindowEvent::CloseRequested { api, .. } = event {
        api.prevent_close();
        let _ = window.hide();
      }
    })
    .build(tauri::generate_context!())
    .expect("error while building tauri application")
    .run(move |app_handle, event| {
      // Persist the runtime config (in particular `config.volume`) when
      // PJS is about to exit. The store is only flushed at app shutdown
      // so per-track-switch MPV restarts never hit the disk.
      if matches!(
        event,
        tauri::RunEvent::ExitRequested { .. } | tauri::RunEvent::Exit
      ) {
        // Kill the MPV process PJS owns so it does not linger after exit.
        let mpv = app_handle.state::<MpvState>().0.clone();
        mpv.kill_process();

        use tauri_plugin_store::StoreExt;
        let snapshot = config.read().clone();
        log::info!(
          "flush_config_on_exit: snapshot.volume={} (writing to disk now)",
          snapshot.volume
        );
        match app_handle.store(crate::command::CONFIG_STORE_FILE) {
          Ok(store) => {
            store.set(
              crate::command::CONFIG_STORE_KEY.to_string(),
              serde_json::to_value(&snapshot).unwrap_or(serde_json::Value::Null),
            );
            match store.save() {
              Ok(_) => log::info!(
                "flush_config_on_exit: persisted config (volume={})",
                snapshot.volume
              ),
              Err(e) => log::error!(
                "flush_config_on_exit: store.save() failed: {} (volume NOT persisted!)",
                e
              ),
            }
          }
          Err(e) => log::error!(
            "flush_config_on_exit: failed to open config store: {} (volume NOT persisted!)",
            e
          ),
        }
      }
    });
}
