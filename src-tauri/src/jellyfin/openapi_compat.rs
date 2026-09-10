//! Hand-rolled HTTP client for the small subset of Jellyfin/Emby endpoints the
//! app uses.
//!
//! Replaces the auto-generated OpenAPI crates
//! (`src-tauri/media-server-api/{jellyfin,emby}`) which previously supplied 11
//! endpoints. We keep only what `client.rs` actually calls; the rest of the
//! OpenAPI surface area stays out of the binary.
//!
//! Response models use plain `Option<T>` + `serde(default)` so that both
//! "field absent" and "field is null" deserialize to `None` — equivalent to
//! the OpenAPI generator's `Option<Option<T>>` triple-state model for the
//! purposes of `client.rs`, which never reads the inner distinction.

use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION};
use reqwest::{Client, Response, StatusCode};
use serde::{Deserialize, Serialize};

use super::error::JellyfinError;

// ---- HTTP helpers -----------------------------------------------------------

pub(super) fn header_value(raw: &str) -> Result<HeaderValue, JellyfinError> {
  HeaderValue::from_str(raw)
    .map_err(|err| JellyfinError::HttpError(format!("Invalid authorization header: {err}")))
}

pub(super) fn build_client(auth_header: &str) -> Result<Client, JellyfinError> {
  let mut headers = HeaderMap::new();
  headers.insert(AUTHORIZATION, header_value(auth_header)?);
  Client::builder()
    .timeout(std::time::Duration::from_secs(30))
    .default_headers(headers)
    .build()
    .map_err(JellyfinError::Http)
}

/// Map a non-2xx response to `JellyfinError`. Returns the response unchanged
/// on success so the caller can read the body with `response.json()` /
/// `response.text()`. On failure the body is drained into the error.
pub(super) async fn ensure_success(
  response: Response,
  context: &str,
) -> Result<Response, JellyfinError> {
  let status = response.status();
  if status.is_success() {
    return Ok(response);
  }
  let body = response.text().await.unwrap_or_default();
  Err(JellyfinError::HttpError(format!(
    "{context} failed: HTTP {status} - {body}"
  )))
}

/// Same as `ensure_success` but converts 401/403 into `AuthFailed`.
pub(super) async fn ensure_success_or_auth(
  response: Response,
  context: &str,
) -> Result<Response, JellyfinError> {
  let status = response.status();
  if status.is_success() {
    return Ok(response);
  }
  let body = response.text().await.unwrap_or_default();
  if matches!(status, StatusCode::UNAUTHORIZED | StatusCode::FORBIDDEN) {
    return Err(JellyfinError::AuthFailed(format!(
      "{context} failed: HTTP {status} - {body}"
    )));
  }
  Err(JellyfinError::HttpError(format!(
    "{context} failed: HTTP {status} - {body}"
  )))
}

// ---- Jellyfin response models ----------------------------------------------

#[derive(Debug, Deserialize)]
pub(super) struct JellyfinAuthResponse {
  #[serde(rename = "User", default)]
  pub user: Option<JellyfinUserDto>,
  #[serde(rename = "AccessToken", default)]
  pub access_token: Option<String>,
  #[serde(rename = "ServerId", default)]
  pub server_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub(super) struct JellyfinUserDto {
  #[serde(rename = "Id", default)]
  pub id: Option<String>,
  #[serde(rename = "Name", default)]
  pub name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub(super) struct JellyfinPublicSystemInfo {
  #[serde(rename = "ServerName", default)]
  pub server_name: Option<String>,
  #[serde(rename = "Version", default)]
  pub version: Option<String>,
  #[serde(rename = "Id", default)]
  pub id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub(super) struct JellyfinQuickConnectRequest {
  #[serde(rename = "Code", default)]
  pub code: Option<String>,
  #[serde(rename = "Secret", default)]
  pub secret: Option<String>,
}

#[derive(Debug, Deserialize)]
pub(super) struct JellyfinQuickConnectState {
  #[serde(rename = "Authenticated", default)]
  pub authenticated: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub(super) struct JellyfinSessionInfo {
  #[serde(rename = "DeviceId", default)]
  pub device_id: Option<String>,
  #[serde(rename = "DeviceName", default)]
  pub device_name: Option<String>,
  #[serde(rename = "Client", default)]
  pub client: Option<String>,
  #[serde(rename = "SupportsMediaControl", default)]
  pub supports_media_control: Option<bool>,
  #[serde(rename = "SupportsRemoteControl", default)]
  pub supports_remote_control: Option<bool>,
}

// ---- Emby response models --------------------------------------------------

#[derive(Debug, Deserialize)]
pub(super) struct EmbyAuthResponse {
  #[serde(rename = "User", default)]
  pub user: Option<EmbyUserDto>,
  #[serde(rename = "AccessToken", default)]
  pub access_token: Option<String>,
  #[serde(rename = "ServerId", default)]
  pub server_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub(super) struct EmbyUserDto {
  #[serde(rename = "Id", default)]
  pub id: Option<String>,
  #[serde(rename = "Name", default)]
  pub name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub(super) struct EmbyPublicSystemInfo {
  #[serde(rename = "ServerName", default)]
  pub server_name: Option<String>,
  #[serde(rename = "Version", default)]
  pub version: Option<String>,
  #[serde(rename = "Id", default)]
  pub id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub(super) struct EmbySystemInfo {
  #[serde(rename = "ServerName", default)]
  pub server_name: Option<String>,
  #[serde(rename = "Version", default)]
  pub version: Option<String>,
  #[serde(rename = "Id", default)]
  pub id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub(super) struct EmbySessionInfo {
  #[serde(rename = "DeviceId", default)]
  pub device_id: Option<String>,
  #[serde(rename = "DeviceName", default)]
  pub device_name: Option<String>,
  #[serde(rename = "Client", default)]
  pub client: Option<String>,
  #[serde(rename = "SupportsRemoteControl", default)]
  pub supports_remote_control: Option<bool>,
}

// ---- Request bodies --------------------------------------------------------

#[derive(Debug, Serialize)]
pub(super) struct EmbyAuthenticateUserByName {
  #[serde(rename = "Username")]
  pub username: String,
  #[serde(rename = "Pw")]
  pub pw: String,
}

#[derive(Debug, Serialize)]
pub(super) struct JellyfinQuickConnectDto {
  #[serde(rename = "Secret")]
  pub secret: String,
}
