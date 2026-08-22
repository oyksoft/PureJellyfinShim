//! Jellyfin HTTP client for REST API calls.

use parking_lot::RwLock;
use reqwest::{header, Client};
use std::sync::Arc;
use uuid::Uuid;

use super::error::JellyfinError;
use super::intro_skipper::{
  parse_intro_skipper_ranges, IntroSkipRange, IntroSkipperPluginResponse,
};
use super::types::*;

/// Device info for Jellyfin client identification.
const DEFAULT_DEVICE_NAME: &str = "PureJellyfinShim";
const DEVICE_ID_PREFIX: &str = "purejellyfinshim-";
const CLIENT_NAME: &str = "PureJellyfinShim";
const CLIENT_VERSION: &str = env!("CARGO_PKG_VERSION");
const SUPPORTED_REMOTE_COMMANDS: &[&str] = &[
  "Play",
  "Playstate",
  "SetVolume",
  "ToggleMute",
  "ToggleFullscreen",
  "SetAudioStreamIndex",
  "SetSubtitleStreamIndex",
];

/// Jellyfin HTTP API client.
pub struct JellyfinClient {
  http: Client,
  state: Arc<RwLock<ClientState>>,
}
/// Login/session lifecycle interface for the Jellyfin HTTP adapter.
pub struct JellyfinLogin<'a> {
  client: &'a JellyfinClient,
}

/// Playback/media interface for the Jellyfin HTTP adapter.
pub struct JellyfinPlayback<'a> {
  client: &'a JellyfinClient,
}

/// Internal connection state.
struct ClientState {
  provider: MediaServerProvider,
  remote_control_available: bool,
  remote_control_warning: Option<String>,
  server_url: Option<String>,
  access_token: Option<String>,
  user_id: Option<String>,
  user_name: Option<String>,
  server_name: Option<String>,
  device_id: String,
  device_name: String,
}

impl JellyfinClient {
  /// Create a new Jellyfin client.
  pub fn new() -> Self {
    let device_id = format!("{}{}", DEVICE_ID_PREFIX, Uuid::new_v4());

    Self {
      http: Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .expect("Failed to create HTTP client"),
      state: Arc::new(RwLock::new(ClientState {
        provider: MediaServerProvider::Jellyfin,
        remote_control_available: false,
        remote_control_warning: None,
        server_url: None,
        access_token: None,
        user_id: None,
        user_name: None,
        server_name: None,
        device_id,
        device_name: DEFAULT_DEVICE_NAME.to_string(),
      })),
    }
  }

  /// Create a client pre-seeded with a saved profile's identity for
  /// validation or re-authentication that must not touch the live client.
  pub fn for_saved_profile(session: &SavedSession) -> Self {
    let client = Self::new();
    {
      let mut state = client.state.write();
      state.provider = session.provider;
      if let Some(saved_device_id) = &session.device_id {
        state.device_id = saved_device_id.clone();
      }
    }
    client
  }

  /// Login/session lifecycle operations.
  pub fn login(&self) -> JellyfinLogin<'_> {
    JellyfinLogin { client: self }
  }

  /// Playback/media operations used by the playback target session.
  pub fn playback(&self) -> JellyfinPlayback<'_> {
    JellyfinPlayback { client: self }
  }

  /// Set the device name (shown in Jellyfin cast menu).
  pub fn set_device_name(&self, name: String) {
    self.state.write().device_name = name;
  }

  /// Get the device ID.
  pub fn device_id(&self) -> String {
    self.state.read().device_id.clone()
  }

  #[allow(dead_code)]
  pub(crate) async fn fetch_origin_image(
    &self,
    url: &str,
  ) -> Result<reqwest::Response, JellyfinError> {
    let token = self.state.read().access_token.clone();
    let response = self
      .http
      .get(url)
      .header(header::AUTHORIZATION, self.auth_header(token.as_deref()))
      .header(header::USER_AGENT, self.request_user_agent())
      .send()
      .await?;
    Ok(response)
  }

  /// Build authorization header value.
  fn auth_header(&self, token: Option<&str>) -> String {
    let state = self.state.read();
    let mut header = format!(
      r#"MediaBrowser Client="{}", Device="{}", DeviceId="{}", Version="{}""#,
      CLIENT_NAME, state.device_name, state.device_id, CLIENT_VERSION
    );
    if let Some(token) = token {
      header.push_str(&format!(r#", Token="{}""#, token));
    }
    header
  }

  fn app_user_agent() -> String {
    format!("{CLIENT_NAME}/{CLIENT_VERSION}")
  }

  fn emby_chrome_user_agent() -> String {
    format!(
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 {CLIENT_NAME}/{CLIENT_VERSION}"
    )
  }

  fn request_user_agent(&self) -> String {
    if self.provider() == MediaServerProvider::Emby {
      Self::emby_chrome_user_agent()
    } else {
      Self::app_user_agent()
    }
  }

  fn openapi_configuration(
    &self,
    server_url: &str,
    token: Option<&str>,
  ) -> Result<jellyfin_api::apis::configuration::Configuration, JellyfinError> {
    let mut headers = header::HeaderMap::new();
    let auth_header = header::HeaderValue::from_str(&self.auth_header(token)).map_err(|err| {
      JellyfinError::HttpError(format!("Invalid Jellyfin authorization header: {err}"))
    })?;
    headers.insert("X-Emby-Authorization", auth_header);

    let mut configuration = jellyfin_api::apis::configuration::Configuration::new();
    configuration.base_path = server_url.to_string();
    configuration.user_agent = Some(Self::app_user_agent());
    configuration.client = Client::builder()
      .timeout(std::time::Duration::from_secs(30))
      .default_headers(headers)
      .build()?;

    Ok(configuration)
  }

  fn emby_openapi_configuration(
    &self,
    server_url: &str,
    token: Option<&str>,
  ) -> Result<emby_api::apis::configuration::Configuration, JellyfinError> {
    let mut headers = header::HeaderMap::new();
    let auth_header = header::HeaderValue::from_str(&self.auth_header(token)).map_err(|err| {
      JellyfinError::HttpError(format!("Invalid Emby authorization header: {err}"))
    })?;
    headers.insert("X-Emby-Authorization", auth_header);

    let mut configuration = emby_api::apis::configuration::Configuration::new();
    configuration.base_path = server_url.to_string();
    configuration.user_agent = Some(Self::emby_chrome_user_agent());
    configuration.client = Client::builder()
      .timeout(std::time::Duration::from_secs(30))
      .default_headers(headers)
      .build()?;

    Ok(configuration)
  }

  fn openapi_error<T: std::fmt::Debug>(
    context: &str,
    err: jellyfin_api::apis::Error<T>,
  ) -> JellyfinError {
    match err {
      jellyfin_api::apis::Error::Reqwest(err) => JellyfinError::Http(err),
      jellyfin_api::apis::Error::Serde(err) => JellyfinError::Json(err),
      jellyfin_api::apis::Error::Io(err) => {
        JellyfinError::HttpError(format!("{context} failed: {err}"))
      }
      jellyfin_api::apis::Error::ResponseError(response) => JellyfinError::HttpError(format!(
        "{context} failed: HTTP {} - {}",
        response.status, response.content
      )),
    }
  }

  fn openapi_auth_error<T: std::fmt::Debug>(
    context: &str,
    err: jellyfin_api::apis::Error<T>,
  ) -> JellyfinError {
    match err {
      jellyfin_api::apis::Error::ResponseError(response)
        if matches!(
          response.status,
          reqwest::StatusCode::UNAUTHORIZED | reqwest::StatusCode::FORBIDDEN
        ) =>
      {
        JellyfinError::AuthFailed(format!(
          "{context} failed: HTTP {} - {}",
          response.status, response.content
        ))
      }
      err => Self::openapi_error(context, err),
    }
  }

  fn emby_openapi_error<T: std::fmt::Debug>(
    context: &str,
    err: emby_api::apis::Error<T>,
  ) -> JellyfinError {
    match err {
      emby_api::apis::Error::Reqwest(err) => JellyfinError::Http(err),
      emby_api::apis::Error::Serde(err) => {
        JellyfinError::HttpError(format!("{context} returned malformed JSON: {err}"))
      }
      emby_api::apis::Error::Io(err) => {
        JellyfinError::HttpError(format!("{context} failed: {err}"))
      }
      emby_api::apis::Error::ResponseError(response) => JellyfinError::HttpError(format!(
        "{context} failed: HTTP {} - {}",
        response.status, response.content
      )),
    }
  }

  fn emby_openapi_auth_error<T: std::fmt::Debug>(
    context: &str,
    err: emby_api::apis::Error<T>,
  ) -> JellyfinError {
    match err {
      emby_api::apis::Error::ResponseError(response)
        if matches!(
          response.status,
          reqwest::StatusCode::UNAUTHORIZED | reqwest::StatusCode::FORBIDDEN
        ) =>
      {
        JellyfinError::AuthFailed(format!(
          "{context} failed: HTTP {} - {}",
          response.status, response.content
        ))
      }
      err => Self::emby_openapi_error(context, err),
    }
  }

  fn missing_openapi_field(context: &str, field: &str) -> JellyfinError {
    JellyfinError::HttpError(format!("{context} response missing {field}"))
  }

  fn auth_response_from_openapi(
    auth: jellyfin_api::models::AuthenticationResult,
  ) -> Result<AuthResponse, JellyfinError> {
    let user = auth
      .user
      .flatten()
      .ok_or_else(|| Self::missing_openapi_field("Authentication", "User"))?;
    let id = user
      .id
      .ok_or_else(|| Self::missing_openapi_field("Authentication", "User.Id"))?;
    let name = user
      .name
      .flatten()
      .ok_or_else(|| Self::missing_openapi_field("Authentication", "User.Name"))?;
    let access_token = auth
      .access_token
      .flatten()
      .ok_or_else(|| Self::missing_openapi_field("Authentication", "AccessToken"))?;
    let server_id = auth
      .server_id
      .flatten()
      .ok_or_else(|| Self::missing_openapi_field("Authentication", "ServerId"))?;

    Ok(AuthResponse {
      user: User {
        id: id.to_string(),
        name,
      },
      access_token,
      server_id,
    })
  }

  fn emby_auth_response_from_openapi(
    auth: emby_api::models::AuthenticationAuthenticationResult,
  ) -> Result<AuthResponse, JellyfinError> {
    let user = auth
      .user
      .ok_or_else(|| Self::missing_openapi_field("Authentication", "User"))?;
    let id = user
      .id
      .ok_or_else(|| Self::missing_openapi_field("Authentication", "User.Id"))?;
    let name = user
      .name
      .ok_or_else(|| Self::missing_openapi_field("Authentication", "User.Name"))?;
    let access_token = auth
      .access_token
      .ok_or_else(|| Self::missing_openapi_field("Authentication", "AccessToken"))?;
    let server_id = auth
      .server_id
      .ok_or_else(|| Self::missing_openapi_field("Authentication", "ServerId"))?;

    Ok(AuthResponse {
      user: User { id, name },
      access_token,
      server_id,
    })
  }

  fn server_info_from_openapi(
    info: jellyfin_api::models::PublicSystemInfo,
  ) -> Result<ServerInfo, JellyfinError> {
    let server_name = info
      .server_name
      .flatten()
      .ok_or_else(|| Self::missing_openapi_field("System public info", "ServerName"))?;
    let version = info
      .version
      .flatten()
      .ok_or_else(|| Self::missing_openapi_field("System public info", "Version"))?;
    let id = info
      .id
      .flatten()
      .ok_or_else(|| Self::missing_openapi_field("System public info", "Id"))?;

    Ok(ServerInfo {
      server_name,
      version,
      id,
    })
  }

  fn emby_server_info_from_openapi(
    info: emby_api::models::PublicSystemInfo,
  ) -> Result<ServerInfo, JellyfinError> {
    let server_name = info
      .server_name
      .ok_or_else(|| Self::missing_openapi_field("System public info", "ServerName"))?;
    let version = info
      .version
      .ok_or_else(|| Self::missing_openapi_field("System public info", "Version"))?;
    let id = info
      .id
      .ok_or_else(|| Self::missing_openapi_field("System public info", "Id"))?;

    Ok(ServerInfo {
      server_name,
      version,
      id,
    })
  }

  fn emby_server_info_from_authenticated_openapi(
    info: emby_api::models::SystemInfo,
  ) -> Result<ServerInfo, JellyfinError> {
    let server_name = info
      .server_name
      .ok_or_else(|| Self::missing_openapi_field("System info", "ServerName"))?;
    let version = info
      .version
      .ok_or_else(|| Self::missing_openapi_field("System info", "Version"))?;
    let id = info
      .id
      .ok_or_else(|| Self::missing_openapi_field("System info", "Id"))?;

    Ok(ServerInfo {
      server_name,
      version,
      id,
    })
  }

  /// Authenticate with Jellyfin server.
  pub async fn authenticate(&self, creds: &Credentials) -> Result<AuthResponse, JellyfinError> {
    match creds.provider {
      MediaServerProvider::Jellyfin => self.authenticate_jellyfin(creds).await,
      MediaServerProvider::Emby => self.authenticate_emby(creds).await,
    }
  }

  async fn authenticate_jellyfin(
    &self,
    creds: &Credentials,
  ) -> Result<AuthResponse, JellyfinError> {
    let server_url = Self::normalize_server_url(&creds.server_url)?;
    let configuration = self.openapi_configuration(&server_url, None)?;

    let auth = jellyfin_api::apis::user_api::authenticate_user_by_name(
      &configuration,
      jellyfin_api::apis::user_api::AuthenticateUserByNameParams {
        authenticate_user_by_name: jellyfin_api::models::AuthenticateUserByName {
          username: Some(Some(creds.username.clone())),
          pw: Some(Some(creds.password.clone())),
        },
      },
    )
    .await
    .map_err(|err| Self::openapi_auth_error("Password authentication", err))
    .and_then(Self::auth_response_from_openapi)?;

    // Store connection state
    {
      let mut state = self.state.write();
      state.provider = MediaServerProvider::Jellyfin;
      state.remote_control_available = false;
      state.remote_control_warning = None;
      state.server_url = Some(server_url);
      state.access_token = Some(auth.access_token.clone());
      state.user_id = Some(auth.user.id.clone());
      state.user_name = Some(auth.user.name.clone());
    }

    // Fetch server info
    self.fetch_server_info().await.ok();

    Ok(auth)
  }

  async fn authenticate_emby(&self, creds: &Credentials) -> Result<AuthResponse, JellyfinError> {
    let (server_url, auth, info) = self.authenticate_emby_with_discovery(creds).await?;

    {
      let mut state = self.state.write();
      state.provider = MediaServerProvider::Emby;
      state.remote_control_available = false;
      state.remote_control_warning = None;
      state.server_url = Some(server_url);
      state.access_token = Some(auth.access_token.clone());
      state.user_id = Some(auth.user.id.clone());
      state.user_name = Some(auth.user.name.clone());
      state.server_name = info.map(|info| info.server_name);
    }

    Ok(auth)
  }

  async fn authenticate_emby_with_discovery(
    &self,
    creds: &Credentials,
  ) -> Result<(String, AuthResponse, Option<ServerInfo>), JellyfinError> {
    let candidates = Self::emby_api_base_candidates(&creds.server_url)?;
    let mut public_info_failures = Vec::new();

    for candidate in &candidates {
      let configuration = self.emby_openapi_configuration(candidate, None)?;
      match emby_api::apis::system_service_api::get_system_info_public(&configuration)
        .await
        .map_err(|err| Self::emby_openapi_error("System public info", err))
        .and_then(Self::emby_server_info_from_openapi)
      {
        Ok(info) => {
          let auth = self.authenticate_emby_at_base(candidate, creds).await?;
          return Ok((candidate.clone(), auth, Some(info)));
        }
        Err(err) => public_info_failures.push(format!("{candidate}: {err}")),
      }
    }

    let mut auth_failures = Vec::new();

    for candidate in candidates {
      match self.authenticate_emby_at_base(&candidate, creds).await {
        Ok(auth) => {
          let info = self
            .fetch_authenticated_emby_server_info(&candidate, &auth.access_token)
            .await
            .ok();
          return Ok((candidate, auth, info));
        }
        Err(JellyfinError::AuthFailed(message)) => {
          auth_failures.push(format!("{candidate}: {message}"));
        }
        Err(err) => auth_failures.push(format!("{candidate}: {err}")),
      }
    }

    if auth_failures
      .iter()
      .any(|failure| failure.contains("HTTP 401 Unauthorized"))
    {
      return Err(JellyfinError::AuthFailed(format!(
        "Password authentication failed. {}",
        auth_failures.join("; ")
      )));
    }

    Err(JellyfinError::HttpError(format!(
      "Unable to discover Emby API base URL. {}; authenticated fallback failed. {}",
      public_info_failures.join("; "),
      auth_failures.join("; ")
    )))
  }

  async fn authenticate_emby_at_base(
    &self,
    server_url: &str,
    creds: &Credentials,
  ) -> Result<AuthResponse, JellyfinError> {
    let configuration = self.emby_openapi_configuration(server_url, None)?;

    emby_api::apis::user_service_api::post_users_authenticatebyname(
      &configuration,
      emby_api::apis::user_service_api::PostUsersAuthenticatebynameParams {
        x_emby_authorization: self.auth_header(None),
        authenticate_user_by_name: emby_api::models::AuthenticateUserByName {
          username: Some(creds.username.clone()),
          pw: Some(creds.password.clone()),
        },
      },
    )
    .await
    .map_err(|err| Self::emby_openapi_auth_error("Password authentication", err))
    .and_then(Self::emby_auth_response_from_openapi)
  }

  async fn fetch_authenticated_emby_server_info(
    &self,
    server_url: &str,
    token: &str,
  ) -> Result<ServerInfo, JellyfinError> {
    let configuration = self.emby_openapi_configuration(server_url, Some(token))?;

    emby_api::apis::system_service_api::get_system_info(&configuration)
      .await
      .map_err(|err| Self::emby_openapi_error("System info", err))
      .and_then(Self::emby_server_info_from_authenticated_openapi)
  }

  /// Start a Quick Connect request on a Jellyfin server.
  pub async fn quick_connect_start(
    &self,
    server_url: &str,
  ) -> Result<QuickConnectRequest, JellyfinError> {
    let server_url = Self::normalize_server_url(server_url)?;
    let configuration = self.openapi_configuration(&server_url, None)?;

    let request = jellyfin_api::apis::quick_connect_api::initiate_quick_connect(&configuration)
      .await
      .map_err(|err| match err {
        jellyfin_api::apis::Error::ResponseError(response)
          if response.status == reqwest::StatusCode::UNAUTHORIZED =>
        {
          JellyfinError::QuickConnectUnavailable
        }
        err => Self::openapi_error("Quick Connect initiation", err),
      })?;

    Ok(QuickConnectRequest {
      code: request
        .code
        .ok_or_else(|| Self::missing_openapi_field("Quick Connect initiation", "Code"))?,
      secret: request
        .secret
        .ok_or_else(|| Self::missing_openapi_field("Quick Connect initiation", "Secret"))?,
    })
  }

  /// Check whether a Quick Connect request has been approved.
  pub async fn quick_connect_check(
    &self,
    server_url: &str,
    secret: &str,
  ) -> Result<QuickConnectStatus, JellyfinError> {
    let server_url = Self::normalize_server_url(server_url)?;
    let configuration = self.openapi_configuration(&server_url, None)?;

    let state = jellyfin_api::apis::quick_connect_api::get_quick_connect_state(
      &configuration,
      jellyfin_api::apis::quick_connect_api::GetQuickConnectStateParams {
        secret: secret.to_string(),
      },
    )
    .await
    .map_err(|err| Self::openapi_error("Quick Connect status", err))?;

    if state.authenticated.unwrap_or(false) {
      Ok(QuickConnectStatus::Approved)
    } else {
      Ok(QuickConnectStatus::Waiting)
    }
  }

  /// Complete Quick Connect authentication after the request is approved.
  pub async fn quick_connect_authenticate(
    &self,
    server_url: &str,
    secret: &str,
  ) -> Result<AuthResponse, JellyfinError> {
    let server_url = Self::normalize_server_url(server_url)?;
    let configuration = self.openapi_configuration(&server_url, None)?;

    let auth = jellyfin_api::apis::user_api::authenticate_with_quick_connect(
      &configuration,
      jellyfin_api::apis::user_api::AuthenticateWithQuickConnectParams {
        quick_connect_dto: jellyfin_api::models::QuickConnectDto {
          secret: secret.to_string(),
        },
      },
    )
    .await
    .map_err(|err| Self::openapi_auth_error("Quick Connect authentication", err))
    .and_then(Self::auth_response_from_openapi)?;

    {
      let mut state = self.state.write();
      state.server_url = Some(server_url);
      state.access_token = Some(auth.access_token.clone());
      state.user_id = Some(auth.user.id.clone());
      state.user_name = Some(auth.user.name.clone());
    }

    self.fetch_server_info().await.ok();

    Ok(auth)
  }

  /// Fetch server public info.
  async fn fetch_server_info(&self) -> Result<ServerInfo, JellyfinError> {
    let server_url = self.server_url()?;
    let provider = self.state.read().provider;

    let info = match provider {
      MediaServerProvider::Jellyfin => {
        let configuration = self.openapi_configuration(&server_url, None)?;

        jellyfin_api::apis::system_api::get_public_system_info(&configuration)
          .await
          .map_err(|err| Self::openapi_error("System public info", err))
          .and_then(Self::server_info_from_openapi)?
      }
      MediaServerProvider::Emby => {
        let configuration = self.emby_openapi_configuration(&server_url, None)?;

        emby_api::apis::system_service_api::get_system_info_public(&configuration)
          .await
          .map_err(|err| Self::emby_openapi_error("System public info", err))
          .and_then(Self::emby_server_info_from_openapi)?
      }
    };

    {
      let mut state = self.state.write();
      state.server_name = Some(info.server_name.clone());
    }

    Ok(info)
  }

  async fn validate_saved_token(&self) -> Result<(), JellyfinError> {
    let server_url = self.server_url()?;
    let token = self.access_token()?;
    let provider = self.state.read().provider;

    match provider {
      MediaServerProvider::Jellyfin => {
        let configuration = self.openapi_configuration(&server_url, Some(&token))?;

        jellyfin_api::apis::user_api::get_current_user(&configuration)
          .await
          .map_err(|err| Self::openapi_auth_error("Saved session validation", err))?;
      }
      MediaServerProvider::Emby => {
        let user_id = self.user_id()?;
        let configuration = self.emby_openapi_configuration(&server_url, Some(&token))?;

        emby_api::apis::user_service_api::get_users_by_id(
          &configuration,
          emby_api::apis::user_service_api::GetUsersByIdParams { id: user_id },
        )
        .await
        .map_err(|err| Self::emby_openapi_auth_error("Saved session validation", err))?;
      }
    }

    Ok(())
  }

  /// Disconnect from server.
  pub fn disconnect(&self) {
    let mut state = self.state.write();
    state.provider = MediaServerProvider::Jellyfin;
    state.remote_control_available = false;
    state.remote_control_warning = None;
    state.server_url = None;
    state.access_token = None;
    state.user_id = None;
    state.user_name = None;
    state.server_name = None;
  }

  /// Restore a session from saved data.
  ///
  /// Validates the token by making a test API call.
  pub async fn restore_session(&self, session: &SavedSession) -> Result<(), JellyfinError> {
    // Set the state first
    {
      let mut state = self.state.write();
      state.provider = session.provider;
      state.remote_control_available = false;
      state.remote_control_warning = None;
      state.server_url = Some(session.server_url.clone());
      state.access_token = Some(session.access_token.clone());
      state.user_id = Some(session.user_id.clone());
      state.user_name = Some(session.user_name.clone());
      state.server_name = session.server_name.clone();
      // Restore device_id if present, otherwise keep the generated one
      if let Some(saved_device_id) = &session.device_id {
        state.device_id = saved_device_id.clone();
      }
    }

    // Validate the token with an authenticated endpoint, then refresh public
    // server info for connection state.
    let validation_result = async {
      self.validate_saved_token().await?;
      if matches!(session.provider, MediaServerProvider::Jellyfin) {
        self.fetch_server_info().await?;
      }
      Ok::<(), JellyfinError>(())
    }
    .await;

    match validation_result {
      Ok(_) => Ok(()),
      Err(e) => {
        self.disconnect();
        Err(e)
      }
    }
  }

  /// Get current session data for persistence.
  pub fn get_saved_session(&self) -> Option<SavedSession> {
    let state = self.state.read();
    if let (Some(server_url), Some(access_token), Some(user_id), Some(user_name)) = (
      state.server_url.clone(),
      state.access_token.clone(),
      state.user_id.clone(),
      state.user_name.clone(),
    ) {
      Some(SavedSession {
        provider: state.provider,
        server_url,
        access_token,
        user_id,
        user_name,
        server_name: state.server_name.clone(),
        device_id: Some(state.device_id.clone()),
      })
    } else {
      None
    }
  }

  /// Check if connected.
  pub fn is_connected(&self) -> bool {
    let state = self.state.read();
    state.access_token.is_some()
  }

  /// Get current connection state.
  pub fn connection_state(&self) -> ConnectionState {
    let state = self.state.read();
    ConnectionState {
      provider: state.provider,
      capabilities: Self::provider_capabilities(&state),
      connected: state.access_token.is_some(),
      server_url: state.server_url.clone(),
      server_name: state.server_name.clone(),
      user_id: state.user_id.clone(),
      user_name: state.user_name.clone(),
    }
  }

  /// Get server URL or error if not connected.
  fn server_url(&self) -> Result<String, JellyfinError> {
    self
      .state
      .read()
      .server_url
      .clone()
      .ok_or(JellyfinError::NotConnected)
  }

  fn normalize_server_url(server_url: &str) -> Result<String, JellyfinError> {
    let server_url = server_url.trim_end_matches('/').to_string();
    let parsed = reqwest::Url::parse(&server_url)
      .map_err(|err| JellyfinError::InvalidUrl(format!("URL could not be parsed: {err}")))?;
    if parsed.scheme() != "http" && parsed.scheme() != "https" {
      return Err(JellyfinError::InvalidUrl(
        "URL must start with http:// or https://".to_string(),
      ));
    }
    if parsed.host_str().is_none() {
      return Err(JellyfinError::InvalidUrl(
        "URL must include a hostname".to_string(),
      ));
    }
    if parsed.query().is_some() || parsed.fragment().is_some() {
      return Err(JellyfinError::InvalidUrl(
        "URL must not include a query string or fragment".to_string(),
      ));
    }

    Ok(server_url)
  }

  fn emby_api_base_candidates(server_url: &str) -> Result<Vec<String>, JellyfinError> {
    let server_url = Self::normalize_server_url(server_url)?;
    let mut candidates = vec![server_url.clone()];

    if !server_url.ends_with("/emby") {
      candidates.push(format!("{server_url}/emby"));
    }

    Ok(candidates)
  }

  fn provider_capabilities(state: &ClientState) -> ProviderCapabilities {
    match state.provider {
      MediaServerProvider::Jellyfin => ProviderCapabilities {
        quick_connect: true,
        intro_skipper: true,
        remote_control: true,
        remote_control_available: state.remote_control_available,
        remote_control_warning: state.remote_control_warning.clone(),
      },
      MediaServerProvider::Emby => ProviderCapabilities {
        quick_connect: false,
        intro_skipper: false,
        remote_control: state.remote_control_warning.is_none(),
        remote_control_available: state.remote_control_available,
        remote_control_warning: state.remote_control_warning.clone(),
      },
    }
  }

  pub fn supports_remote_control(&self) -> bool {
    let state = self.state.read();
    Self::provider_capabilities(&state).remote_control
  }

  /// Whether the connected server offers the Intro Skipper plugin endpoint.
  pub fn supports_intro_skipper(&self) -> bool {
    let state = self.state.read();
    Self::provider_capabilities(&state).intro_skipper
  }

  /// Active media server provider for the connected session.
  pub fn provider(&self) -> MediaServerProvider {
    self.state.read().provider
  }

  /// Get access token or error if not connected.
  fn access_token(&self) -> Result<String, JellyfinError> {
    self
      .state
      .read()
      .access_token
      .clone()
      .ok_or(JellyfinError::NotConnected)
  }

  /// Get user ID or error if not connected.
  pub fn user_id(&self) -> Result<String, JellyfinError> {
    self
      .state
      .read()
      .user_id
      .clone()
      .ok_or(JellyfinError::NotConnected)
  }

  /// Make an authenticated GET request.
  pub async fn get<T: serde::de::DeserializeOwned>(&self, path: &str) -> Result<T, JellyfinError> {
    let server_url = self.server_url()?;
    let token = self.access_token()?;
    let url = format!("{}{}", server_url, path);

    let response = self
      .http
      .get(&url)
      .header(header::USER_AGENT, self.request_user_agent())
      .header("X-Emby-Authorization", self.auth_header(Some(&token)))
      .send()
      .await?;

    let status = response.status();
    if !status.is_success() {
      let body = response.text().await.unwrap_or_default();
      return Err(JellyfinError::HttpError(format!(
        "GET {} failed: HTTP {} - {}",
        path, status, body
      )));
    }

    Ok(response.json().await?)
  }

  /// Make an authenticated POST request.
  pub async fn post<T: serde::de::DeserializeOwned, B: serde::Serialize>(
    &self,
    path: &str,
    body: &B,
  ) -> Result<T, JellyfinError> {
    let server_url = self.server_url()?;
    let token = self.access_token()?;
    let url = format!("{}{}", server_url, path);

    let response = self
      .http
      .post(&url)
      .header(header::USER_AGENT, self.request_user_agent())
      .header(header::CONTENT_TYPE, "application/json")
      .header("X-Emby-Authorization", self.auth_header(Some(&token)))
      .json(body)
      .send()
      .await?;

    let status = response.status();
    if !status.is_success() {
      let body = response.text().await.unwrap_or_default();
      return Err(JellyfinError::HttpError(format!(
        "POST {} failed: HTTP {} - {}",
        path, status, body
      )));
    }

    Ok(response.json().await?)
  }

  /// Make an authenticated POST request without expecting a response body.
  pub async fn post_empty<B: serde::Serialize + std::fmt::Debug>(
    &self,
    path: &str,
    body: &B,
  ) -> Result<(), JellyfinError> {
    let server_url = self.server_url()?;
    let token = self.access_token()?;
    let url = format!("{}{}", server_url, path);

    log::debug!("POST {} with body: {:?}", path, body);

    let response = self
      .http
      .post(&url)
      .header(header::USER_AGENT, self.request_user_agent())
      .header(header::CONTENT_TYPE, "application/json")
      .header("X-Emby-Authorization", self.auth_header(Some(&token)))
      .json(body)
      .send()
      .await?;

    let status = response.status();
    if !status.is_success() {
      let body = response.text().await.unwrap_or_default();
      log::error!("POST {} failed with status {}: {}", path, status, body);
      return Err(JellyfinError::HttpError(format!(
        "HTTP {} - {}",
        status, body
      )));
    }

    Ok(())
  }

  /// Get media item by ID.
  pub async fn get_item(&self, item_id: &str) -> Result<MediaItem, JellyfinError> {
    let user_id = self.user_id()?;
    self
      .get(&format!("/Users/{}/Items/{}", user_id, item_id))
      .await
  }

  /// Get playback info for a media item.
  pub async fn get_playback_info(
    &self,
    item_id: &str,
    start_time_ticks: Option<i64>,
    audio_stream_index: Option<i32>,
    subtitle_stream_index: Option<i32>,
  ) -> Result<PlaybackInfoResponse, JellyfinError> {
    let user_id = self.user_id()?;
    let path = format!("/Items/{}/PlaybackInfo", item_id);

    let request = PlaybackInfoRequest {
      user_id,
      device_id: self.device_id(),
      max_streaming_bitrate: Some(140_000_000), // 140 Mbps
      start_time_ticks,
      audio_stream_index,
      subtitle_stream_index,
      enable_direct_play: true,
      enable_direct_stream: true,
      enable_transcoding: true,
      auto_open_live_stream: true,
    };

    self.post(&path, &request).await
  }

  /// Fetch active Intro Skipper plugin ranges for a media item.
  ///
  /// Missing, disabled, invalid, or failing plugin endpoints are treated as no
  /// ranges so playback can continue normally.
  pub async fn get_intro_skipper_ranges(
    &self,
    item_id: &str,
  ) -> Result<Vec<IntroSkipRange>, JellyfinError> {
    let path = format!("/Episode/{}/IntroSkipperSegments", item_id);
    let response = self.get::<IntroSkipperPluginResponse>(&path).await?;

    Ok(parse_intro_skipper_ranges(response))
  }

  /// Build the direct play URL for a media source.
  /// Always uses HTTP streaming URL - even for "File" protocol sources,
  /// since the file path is on the server, not accessible locally.
  pub fn build_stream_url(&self, item_id: &str, media_source: &MediaSource) -> Option<String> {
    let state = self.state.read();
    let server_url = state.server_url.as_ref()?;
    let token = state.access_token.as_ref()?;

    if !media_source.supports_direct_play {
      if media_source.supports_direct_stream {
        if let Some(url) = media_source.direct_stream_url.as_deref() {
          let url = absolute_server_url(server_url, url);
          return Some(append_api_key_if_missing(&url, token));
        }
      }

      if media_source.supports_transcoding {
        if let Some(url) = media_source.transcoding_url.as_deref() {
          let url = absolute_server_url(server_url, url);
          return Some(append_api_key_if_missing(&url, token));
        }
      }
    }

    // Build streaming URL - always use HTTP, never raw file paths.
    // The file path in media_source.path is on the server, not locally accessible.
    let container = media_source.container.as_deref().unwrap_or("mkv");
    Some(format!(
      "{}/Videos/{}/stream.{}?Static=true&MediaSourceId={}&api_key={}",
      server_url, item_id, container, media_source.id, token
    ))
  }

  /// Build external subtitle URL with correct format extension.
  ///
  /// Uses the subtitle's codec to determine the file extension (ass, ssa, srt, vtt).
  /// This prevents Jellyfin from attempting to transcode the subtitle, which can fail
  /// for formats like ASS/SSA when requesting as SRT.
  ///
  /// MPV natively supports all these formats, so we should always request the original.
  pub fn build_subtitle_url(
    &self,
    item_id: &str,
    media_source_id: &str,
    stream: &MediaStream,
  ) -> Option<String> {
    let state = self.state.read();
    let server_url = state.server_url.as_ref()?;
    let token = state.access_token.as_ref()?;

    // Normalize codec to lowercase for case-insensitive matching.
    // Jellyfin can report codecs in various cases (e.g., "PGSSUB", "ass", "subrip").
    let codec = stream.codec.as_deref().unwrap_or("").to_ascii_lowercase();

    // Map codec to file extension (prevents transcoding)
    let ext = match codec.as_str() {
      "ass" => "ass",
      "ssa" => "ssa",
      "subrip" | "srt" => "srt",
      "webvtt" | "vtt" => "vtt",
      // Bitmap subtitle formats
      "pgs" | "pgssub" | "hdmv_pgs_subtitle" => "sup",
      "dvdsub" | "dvd_subtitle" | "vobsub" => "sub",
      "dvbsub" | "dvb_subtitle" => "sub",
      // Other text formats
      "mov_text" => "srt", // MP4 timed text - request as SRT
      "ttml" => "ttml",
      _ => "srt", // fallback for unknown codecs
    };

    // Jellyfin subtitle endpoint format:
    // /Videos/{itemId}/{mediaSourceId}/Subtitles/{streamIndex}/Stream.{format}
    Some(format!(
      "{}/Videos/{}/{}/Subtitles/{}/Stream.{}?api_key={}",
      server_url, item_id, media_source_id, stream.index, ext, token
    ))
  }

  /// Get WebSocket URL for session.
  pub fn websocket_url(&self) -> Result<String, JellyfinError> {
    let state = self.state.read();
    let server_url = state
      .server_url
      .as_ref()
      .ok_or(JellyfinError::NotConnected)?;
    let token = state
      .access_token
      .as_ref()
      .ok_or(JellyfinError::NotConnected)?;

    // Convert http(s) to ws(s)
    let ws_url = if server_url.starts_with("https://") {
      server_url.replace("https://", "wss://")
    } else {
      server_url.replace("http://", "ws://")
    };

    Ok(format!(
      "{}/socket?api_key={}&deviceId={}",
      ws_url, token, state.device_id
    ))
  }

  /// Report playback started.
  pub async fn report_playback_start(&self, info: &PlaybackStartInfo) -> Result<(), JellyfinError> {
    self.post_empty("/Sessions/Playing", info).await
  }

  /// Report playback progress.
  pub async fn report_playback_progress(
    &self,
    info: &PlaybackProgressInfo,
  ) -> Result<(), JellyfinError> {
    self.post_empty("/Sessions/Playing/Progress", info).await
  }

  /// Report playback stopped.
  pub async fn report_playback_stop(&self, info: &PlaybackStopInfo) -> Result<(), JellyfinError> {
    self.post_empty("/Sessions/Playing/Stopped", info).await
  }

  /// Report session capabilities to Jellyfin via HTTP.
  ///
  /// This makes the client appear as a controllable cast target.
  pub async fn report_capabilities(&self) -> Result<(), JellyfinError> {
    let capabilities = serde_json::json!({
      "PlayableMediaTypes": ["Video", "Audio"],
      "SupportedCommands": SUPPORTED_REMOTE_COMMANDS,
      "SupportsMediaControl": true,
      "SupportsPersistentIdentifier": true,
    });

    let server_url = self.server_url()?;
    let token = self.access_token()?;
    let url = format!("{}/Sessions/Capabilities/Full", server_url);

    let response = self
      .http
      .post(&url)
      .header(header::USER_AGENT, self.request_user_agent())
      .header(reqwest::header::CONTENT_TYPE, "application/json")
      .header("X-Emby-Authorization", self.auth_header(Some(&token)))
      .json(&capabilities)
      .send()
      .await?;

    log::info!("Capabilities POST response status: {}", response.status());
    if !response.status().is_success() {
      let status = response.status();
      let text = response.text().await.unwrap_or_default();
      log::error!("Capabilities POST failed: HTTP {} - {}", status, text);
    }

    Ok(())
  }

  /// Get the next episode in a series after the given episode.
  ///
  /// Uses the /Shows/{seriesId}/Episodes endpoint with StartItemId to get adjacent episodes.
  /// Returns None if there's no next episode or if the item is not an episode.
  pub async fn get_next_episode(
    &self,
    current_item: &MediaItem,
  ) -> Result<Option<MediaItem>, JellyfinError> {
    // Only works for episodes
    if current_item.item_type != "Episode" {
      log::debug!("get_next_episode: not an episode, skipping");
      return Ok(None);
    }

    let series_id = match &current_item.series_id {
      Some(id) => id,
      None => {
        log::debug!("get_next_episode: no series_id, skipping");
        return Ok(None);
      }
    };

    let user_id = self.user_id()?;

    // Get episodes starting from current, limit 2 (current + next)
    let path = format!(
      "/Shows/{}/Episodes?UserId={}&StartItemId={}&Limit=2&Fields=MediaSources,MediaStreams",
      series_id, user_id, current_item.id
    );

    let response: EpisodesResponse = self.get(&path).await?;

    // The response includes the current episode and the next one (if exists)
    // We want the second item (index 1) which is the next episode
    if response.items.len() >= 2 {
      let next_ep = response.items.into_iter().nth(1);
      if let Some(ref ep) = next_ep {
        log::info!(
          "Found next episode: {} - S{:02}E{:02} - {}",
          ep.series_name.as_deref().unwrap_or("Unknown"),
          ep.parent_index_number.unwrap_or(0),
          ep.index_number.unwrap_or(0),
          ep.name
        );
      }
      Ok(next_ep)
    } else {
      log::info!("No next episode available (end of series or season)");
      Ok(None)
    }
  }

  /// Get the previous episode in a series before the given episode.
  ///
  /// Uses the /Shows/{seriesId}/Episodes endpoint to find adjacent episodes.
  /// Returns None if there's no previous episode or if the item is not an episode.
  pub async fn get_previous_episode(
    &self,
    current_item: &MediaItem,
  ) -> Result<Option<MediaItem>, JellyfinError> {
    // Only works for episodes
    if current_item.item_type != "Episode" {
      log::debug!("get_previous_episode: not an episode, skipping");
      return Ok(None);
    }

    let series_id = match &current_item.series_id {
      Some(id) => id,
      None => {
        log::debug!("get_previous_episode: no series_id, skipping");
        return Ok(None);
      }
    };

    let user_id = self.user_id()?;

    // Get all episodes for the series to find the previous one
    // We need to fetch episodes and find the one before current
    let path = format!(
      "/Shows/{}/Episodes?UserId={}&Fields=MediaSources,MediaStreams",
      series_id, user_id
    );

    let response: EpisodesResponse = self.get(&path).await?;

    // Find the current episode index and return the previous one
    let mut prev_ep: Option<MediaItem> = None;
    for ep in response.items {
      if ep.id == current_item.id {
        // Found current, return the previous one (if any)
        if let Some(ref prev) = prev_ep {
          log::info!(
            "Found previous episode: {} - S{:02}E{:02} - {}",
            prev.series_name.as_deref().unwrap_or("Unknown"),
            prev.parent_index_number.unwrap_or(0),
            prev.index_number.unwrap_or(0),
            prev.name
          );
        }
        return Ok(prev_ep);
      }
      prev_ep = Some(ep);
    }

    log::info!("No previous episode available (start of series)");
    Ok(None)
  }

  /// Validate that our session appears in the Jellyfin session list.
  /// This checks if we're visible as a cast target.
  pub async fn validate_session(&self) -> Result<(), JellyfinError> {
    match self.provider() {
      MediaServerProvider::Jellyfin => self.validate_jellyfin_session().await,
      MediaServerProvider::Emby => self.validate_emby_session().await,
    }
  }

  async fn validate_jellyfin_session(&self) -> Result<(), JellyfinError> {
    let device_id = self.device_id();
    let server_url = self.server_url()?;
    let token = self.access_token()?;
    let configuration = self.openapi_configuration(&server_url, Some(&token))?;

    let sessions = jellyfin_api::apis::session_api::get_sessions(
      &configuration,
      jellyfin_api::apis::session_api::GetSessionsParams {
        controllable_by_user_id: None,
        device_id: None,
        active_within_seconds: None,
      },
    )
    .await
    .map_err(|err| Self::openapi_error("Session validation", err))?;

    // Look for our device in the session list
    for session in &sessions {
      if let Some(session_device_id) = session.device_id.as_ref().and_then(|id| id.as_ref()) {
        if session_device_id == &device_id {
          // Found our session! Check if it supports media control
          let supports_media_control = session.supports_media_control.unwrap_or(false);
          let supports_remote_control = session.supports_remote_control.unwrap_or(false);

          log::info!(
            "Found our session: DeviceId={}, SupportsMediaControl={}, SupportsRemoteControl={}",
            device_id,
            supports_media_control,
            supports_remote_control
          );

          log::debug!("Session details: {:?}", session);

          if supports_media_control {
            let mut state = self.state.write();
            state.remote_control_available = true;
            state.remote_control_warning = None;
            return Ok(());
          } else {
            let mut state = self.state.write();
            state.remote_control_available = false;
            state.remote_control_warning = Some(
              "Remote control is unavailable because the server did not grant media control."
                .to_string(),
            );
            return Err(JellyfinError::SessionNotFound);
          }
        }
      }
    }

    // Log all sessions for debugging
    log::warn!(
      "Our session not found in session list. Our DeviceId={}, Total sessions={}",
      device_id,
      sessions.len()
    );
    for (i, session) in sessions.iter().enumerate() {
      let sess_device_id = session
        .device_id
        .as_ref()
        .and_then(|id| id.as_deref())
        .unwrap_or("?");
      let sess_device_name = session
        .device_name
        .as_ref()
        .and_then(|name| name.as_deref())
        .unwrap_or("?");
      let sess_client = session
        .client
        .as_ref()
        .and_then(|client| client.as_deref())
        .unwrap_or("?");
      let supports_media = session.supports_media_control.unwrap_or(false);
      log::info!(
        "Session[{}]: DeviceId={}, DeviceName={}, Client={}, SupportsMediaControl={}",
        i,
        sess_device_id,
        sess_device_name,
        sess_client,
        supports_media
      );
    }
    {
      let mut state = self.state.write();
      state.remote_control_available = false;
      state.remote_control_warning = Some(
        "Remote control is unavailable because the session is not visible to the server."
          .to_string(),
      );
    }
    Err(JellyfinError::SessionNotFound)
  }

  async fn validate_emby_session(&self) -> Result<(), JellyfinError> {
    let device_id = self.device_id();
    let server_url = self.server_url()?;
    let token = self.access_token()?;
    let configuration = self.emby_openapi_configuration(&server_url, Some(&token))?;

    let sessions = emby_api::apis::sessions_service_api::get_sessions(
      &configuration,
      emby_api::apis::sessions_service_api::GetSessionsParams {
        controllable_by_user_id: None,
        device_id: None,
        id: None,
      },
    )
    .await
    .map_err(|err| Self::emby_openapi_error("Emby session validation", err))?;

    for session in &sessions {
      if let Some(session_device_id) = session.device_id.as_ref() {
        if session_device_id == &device_id {
          let supports_remote_control = session.supports_remote_control.unwrap_or(false);

          log::info!(
            "Found our Emby session: DeviceId={}, SupportsRemoteControl={}",
            device_id,
            supports_remote_control
          );

          log::debug!("Emby session details: {:?}", session);

          if supports_remote_control {
            let mut state = self.state.write();
            state.remote_control_available = true;
            state.remote_control_warning = None;
            return Ok(());
          } else {
            let mut state = self.state.write();
            state.remote_control_available = false;
            state.remote_control_warning = Some(
              "Remote control is unavailable because the server did not grant remote control."
                .to_string(),
            );
            return Err(JellyfinError::SessionNotFound);
          }
        }
      }
    }

    log::warn!(
      "Our Emby session not found in session list. Our DeviceId={}, Total sessions={}",
      device_id,
      sessions.len()
    );
    for (i, session) in sessions.iter().enumerate() {
      let sess_device_id = session.device_id.as_deref().unwrap_or("?");
      let sess_device_name = session.device_name.as_deref().unwrap_or("?");
      let sess_client = session.client.as_deref().unwrap_or("?");
      let supports_remote = session.supports_remote_control.unwrap_or(false);
      log::info!(
        "Emby Session[{}]: DeviceId={}, DeviceName={}, Client={}, SupportsRemoteControl={}",
        i,
        sess_device_id,
        sess_device_name,
        sess_client,
        supports_remote
      );
    }
    {
      let mut state = self.state.write();
      state.remote_control_available = false;
      state.remote_control_warning = Some(
        "Remote control is unavailable because the session is not visible to the server."
          .to_string(),
      );
    }
    Err(JellyfinError::SessionNotFound)
  }
}

impl<'a> JellyfinLogin<'a> {
  pub async fn authenticate(&self, creds: &Credentials) -> Result<AuthResponse, JellyfinError> {
    self.client.authenticate(creds).await
  }

  pub async fn quick_connect_start(
    &self,
    server_url: &str,
  ) -> Result<QuickConnectRequest, JellyfinError> {
    self.client.quick_connect_start(server_url).await
  }

  pub async fn quick_connect_check(
    &self,
    server_url: &str,
    secret: &str,
  ) -> Result<QuickConnectStatus, JellyfinError> {
    self.client.quick_connect_check(server_url, secret).await
  }

  pub async fn quick_connect_authenticate(
    &self,
    server_url: &str,
    secret: &str,
  ) -> Result<AuthResponse, JellyfinError> {
    self
      .client
      .quick_connect_authenticate(server_url, secret)
      .await
  }

  pub async fn restore_session(&self, session: &SavedSession) -> Result<(), JellyfinError> {
    self.client.restore_session(session).await
  }

  /// Adopt a session that a separate client already validated or
  /// authenticated. This is a non-networking state copy; callers must prove
  /// the session on a separate client before adopting it here.
  pub fn adopt_validated_session(&self, session: &SavedSession) {
    let mut state = self.client.state.write();
    state.provider = session.provider;
    state.remote_control_available = false;
    state.remote_control_warning = None;
    state.server_url = Some(session.server_url.clone());
    state.access_token = Some(session.access_token.clone());
    state.user_id = Some(session.user_id.clone());
    state.user_name = Some(session.user_name.clone());
    state.server_name = session.server_name.clone();
    if let Some(saved_device_id) = &session.device_id {
      state.device_id = saved_device_id.clone();
    }
  }

  pub fn disconnect(&self) {
    self.client.disconnect();
  }

  pub fn get_saved_session(&self) -> Option<SavedSession> {
    self.client.get_saved_session()
  }

  pub fn is_connected(&self) -> bool {
    self.client.is_connected()
  }

  pub fn connection_state(&self) -> ConnectionState {
    self.client.connection_state()
  }
}

impl<'a> JellyfinPlayback<'a> {
  pub fn device_id(&self) -> String {
    self.client.device_id()
  }

  pub async fn get_item(&self, item_id: &str) -> Result<MediaItem, JellyfinError> {
    self.client.get_item(item_id).await
  }

  pub async fn get_playback_info(
    &self,
    item_id: &str,
    start_time_ticks: Option<i64>,
    audio_stream_index: Option<i32>,
    subtitle_stream_index: Option<i32>,
  ) -> Result<PlaybackInfoResponse, JellyfinError> {
    self
      .client
      .get_playback_info(
        item_id,
        start_time_ticks,
        audio_stream_index,
        subtitle_stream_index,
      )
      .await
  }

  pub async fn get_intro_skipper_ranges(
    &self,
    item_id: &str,
  ) -> Result<Vec<IntroSkipRange>, JellyfinError> {
    self.client.get_intro_skipper_ranges(item_id).await
  }

  pub fn build_stream_url(&self, item_id: &str, media_source: &MediaSource) -> Option<String> {
    self.client.build_stream_url(item_id, media_source)
  }

  pub fn build_subtitle_url(
    &self,
    item_id: &str,
    media_source_id: &str,
    stream: &MediaStream,
  ) -> Option<String> {
    self
      .client
      .build_subtitle_url(item_id, media_source_id, stream)
  }

  pub fn websocket_url(&self) -> Result<String, JellyfinError> {
    self.client.websocket_url()
  }

  pub fn websocket_user_agent(&self) -> String {
    self.client.request_user_agent()
  }

  pub async fn report_playback_start(&self, info: &PlaybackStartInfo) -> Result<(), JellyfinError> {
    self.client.report_playback_start(info).await
  }

  pub async fn report_playback_progress(
    &self,
    info: &PlaybackProgressInfo,
  ) -> Result<(), JellyfinError> {
    self.client.report_playback_progress(info).await
  }

  pub async fn report_playback_stop(&self, info: &PlaybackStopInfo) -> Result<(), JellyfinError> {
    self.client.report_playback_stop(info).await
  }

  pub async fn report_capabilities(&self) -> Result<(), JellyfinError> {
    self.client.report_capabilities().await
  }

  pub async fn get_next_episode(
    &self,
    current_item: &MediaItem,
  ) -> Result<Option<MediaItem>, JellyfinError> {
    self.client.get_next_episode(current_item).await
  }

  pub async fn get_previous_episode(
    &self,
    current_item: &MediaItem,
  ) -> Result<Option<MediaItem>, JellyfinError> {
    self.client.get_previous_episode(current_item).await
  }

  pub async fn validate_session(&self) -> Result<(), JellyfinError> {
    self.client.validate_session().await
  }
}

fn absolute_server_url(server_url: &str, path_or_url: &str) -> String {
  if path_or_url.starts_with("http://") || path_or_url.starts_with("https://") {
    path_or_url.to_string()
  } else if let Some(stripped) = path_or_url.strip_prefix('/') {
    format!("{}/{}", server_url.trim_end_matches('/'), stripped)
  } else {
    format!("{}/{}", server_url.trim_end_matches('/'), path_or_url)
  }
}

fn append_api_key_if_missing(url: &str, token: &str) -> String {
  if url.contains("api_key=") {
    url.to_string()
  } else {
    let separator = if url.contains('?') { '&' } else { '?' };
    format!("{}{}api_key={}", url, separator, token)
  }
}
