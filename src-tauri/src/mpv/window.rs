//! MPV window management — focus and raise.
//!
//! Mirrors jellyfin-mpv-shim's `win_utils.raise_mpv` (jellyfin_mpv_shim/win_utils.py).
//! On Windows: enumerate top-level windows, find the one owned by the MPV
//! process we started (matched by PID), then run the ShowWindow(minimize) →
//! ShowWindow(un-minimize) sequence. This is the well-known workaround for
//! `SetForegroundWindow` being silently denied when the calling process is
//! not the foreground process — minimize + restore reliably brings the
//! window forward.
//!
//! PID-scoped search (not title-scoped) is more reliable than jMS's
//! " - mpv" title substring: MPV's window title varies by `--title=` and
//! by media filename, while the process id is exact.
//!
//! No-op on non-Windows targets; callers should still invoke unconditionally
//! (the function is cheap) and the call site is gated to video playback only.
//!
//! Note: we deliberately do **not** set a custom MPV window title. MPV's
//! default "mpv - <filename>" title is what users see in the taskbar /
//! Alt-Tab list, and overriding it would be a regression. Window lookup
//! here goes through the OS process id, so no title marker is needed.

use log::{debug, info};

/// Bring the MPV window owned by `target_pid` to the foreground. If
/// `target_pid` is `None`, the function is a no-op. Does **not** touch
/// the play/pause state — unpausing belongs to the loadfile path because
/// the click/pop caused by unpausing an empty decoder is loud and ugly.
pub fn raise_mpv_window(target_pid: Option<u32>) {
  let Some(pid) = target_pid else {
    return;
  };
  if cfg!(windows) {
    raise_mpv_windows(pid);
  } else {
    let _ = pid;
  }
}

#[cfg(windows)]
fn raise_mpv_windows(pid: u32) -> bool {
  use windows_sys::Win32::Foundation::{HWND, LPARAM};
  use windows_sys::Win32::UI::WindowsAndMessaging::{
    AllowSetForegroundWindow, BringWindowToTop, EnumWindows, GetForegroundWindow, GetWindowTextW,
    GetWindowThreadProcessId, IsWindowVisible, SetForegroundWindow, ShowWindow,
  };
  // SW_SHOW = 5, SW_MINIMIZE = 6, SW_RESTORE = 9
  // ASFW_ANY lets the next SetForegroundWindow from this process succeed
  // even when we are not the foreground process — relaxes the
  // foreground-lock policy that Windows 98+ enforces.
  const SW_SHOW: i32 = 5;
  const SW_MINIMIZE: i32 = 6;
  const SW_RESTORE: i32 = 9;
  const ASFW_ANY: u32 = 0xffff_fffe;

  // Pack the target pid and a `Vec<HWND>` pointer into a 16-byte buffer.
  // EnumWindows' LPARAM is platform-sized, so we stash the data in heap memory
  // the callback can reinterpret. The callback expects the same layout.
  //
  // Layout (little-endian):
  //   [0..4]   u32  target pid
  //   [4..12]  usize pointer to a Vec<HWND>
  struct CallbackData {
    pid: u32,
    list_ptr: *mut Vec<HWND>,
  }

  let mut list: Vec<HWND> = Vec::new();
  let data = CallbackData {
    pid,
    list_ptr: &mut list as *mut Vec<HWND>,
  };
  // LPARAM is `pub type LPARAM = isize` in windows-sys 0.59 — a type alias,
  // not a tuple struct, so we cast and annotate rather than construct.
  let lparam: LPARAM = (&data as *const CallbackData) as isize;

  unsafe extern "system" fn collect(hwnd: HWND, lparam: LPARAM) -> i32 {
    if IsWindowVisible(hwnd) == 0 {
      return 1;
    }
    let mut owner_pid: u32 = 0;
    GetWindowThreadProcessId(hwnd, &mut owner_pid);
    let data = &*(lparam as *const CallbackData);
    if owner_pid == data.pid {
      unsafe {
        (*data.list_ptr).push(hwnd);
      }
    }
    1
  }

  unsafe {
    let _ = EnumWindows(Some(collect), lparam);
  }

  let Some(&target) = list.first() else {
    // No visible MPV window yet — the player is still starting up. Skip.
    return false;
  };
  let fg = unsafe { GetForegroundWindow() };
  if target == fg {
    debug!("raise_mpv: MPV window already in foreground");
    return true;
  }
  // Get window title for diagnostics.
  let mut title_buf = [0u16; 256];
  let title_len = unsafe { GetWindowTextW(target, title_buf.as_mut_ptr(), title_buf.len() as i32) };
  let title = if title_len > 0 {
    String::from_utf16_lossy(&title_buf[..title_len as usize])
  } else {
    String::from("<empty>")
  };
  info!(
    "raise_mpv: raising MPV window (pid={}, hwnd={:p}, title={:?}, fg_hwnd={:p})",
    pid, target, title, fg
  );
  // Three-step escalation. Each step is enough on its own for a particular
  // combination of window state and focus rules, so we run all three:
  //  1. `AllowSetForegroundWindow(ASFW_ANY)` relaxes the foreground-lock
  //     policy so the next SetForegroundWindow from this process succeeds
  //     even though we are not currently the foreground process.
  //  2. `SetForegroundWindow` directly requests foreground. With step 1
  //     this is normally enough; without step 1 it gets silently denied.
  //  3. `ShowWindow(SW_SHOW|SW_RESTORE|SW_MINIMIZE)` is jMS's belt-and-braces
  //     fallback: ensure the window is restored, then nudge it to top via
  //     minimize+restore which is a documented z-order trick. The `SW_SHOW`
  //     pass is added so an off-screen MPV window gets pulled back onto the
  //     primary display first.
  //  4. `BringWindowToTop` is the last-resort call that pushes the window
  //     to the top of the z-order unconditionally.
  unsafe {
    let _ = AllowSetForegroundWindow(ASFW_ANY);
    ShowWindow(target, SW_SHOW);
    ShowWindow(target, SW_RESTORE);
    ShowWindow(target, SW_MINIMIZE);
    ShowWindow(target, SW_RESTORE);
    let _ = SetForegroundWindow(target);
    BringWindowToTop(target);
  }
  true
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn raise_mpv_window_with_none_pid_is_noop() {
    // Pure-RAII no-op; the test just guards the signature.
    raise_mpv_window(None);
  }
}
