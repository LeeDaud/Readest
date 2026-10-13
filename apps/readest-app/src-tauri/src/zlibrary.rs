//! Desktop browser downloads stay in the browser's authenticated session.
//! A ready marker keeps completed files recoverable until library persistence succeeds.
use serde::Serialize;
use std::{
    fs,
    path::PathBuf,
    sync::atomic::{AtomicU64, Ordering},
};
use tauri::{AppHandle, Emitter, Manager, WebviewWindow};

static NEXT_DOWNLOAD: AtomicU64 = AtomicU64::new(0);

#[derive(Clone, Serialize)]
pub struct Download {
    id: String,
    filename: String,
    path: Option<String>,
    status: String,
}

fn root<R: tauri::Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    app.path()
        .app_cache_dir()
        .map(|p| p.join("zlibrary-downloads"))
        .map_err(|e| e.to_string())
}

fn trusted<R: tauri::Runtime>(window: &WebviewWindow<R>) -> Result<(), String> {
    if window.label() != "main" {
        return Err("Only the main application can manage downloads".into());
    }
    Ok(())
}

fn supported(name: &str) -> bool {
    let ext = std::path::Path::new(name)
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();
    matches!(
        ext.as_str(),
        "epub" | "mobi" | "azw" | "azw3" | "fb2" | "cbz" | "pdf" | "txt"
    )
}

/// Desktop entry selection cannot observe WebView2 network failures directly.
/// Probe in native HTTP, preserving authentication/challenge responses as reachable.
#[tauri::command]
pub async fn resolve_zlibrary_entry<R: tauri::Runtime>(
    window: WebviewWindow<R>,
    urls: Vec<String>,
) -> Result<String, String> {
    trusted(&window)?;
    if urls.is_empty() || urls.len() > 10 {
        return Err("Configure between one and ten Z-Library websites".into());
    }
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .redirect(reqwest::redirect::Policy::limited(10))
        .build()
        .map_err(|e| e.to_string())?;
    for entry in urls {
        let url = tauri::Url::parse(&entry).map_err(|_| "Invalid website URL")?;
        if url.scheme() != "https"
            || url.host_str().is_none()
            || !url.username().is_empty()
            || url.password().is_some()
        {
            return Err("Use an HTTPS website URL without embedded credentials".into());
        }
        if let Ok(response) = client.get(url.clone()).send().await {
            if !response.status().is_server_error() && response.status().as_u16() != 404 {
                return Ok(url.to_string());
            }
        }
    }
    Err("所有 Z-Library 网站均连接失败，请在设置中检查网站列表".into())
}

#[tauri::command]
pub async fn open_zlibrary<R: tauri::Runtime>(
    app: AppHandle<R>,
    window: WebviewWindow<R>,
    url: String,
    navigate: bool,
) -> Result<(), String> {
    trusted(&window)?;
    #[cfg(not(desktop))]
    {
        let _ = (app, url, navigate);
        Err("Z-Library browsing currently requires the desktop app".into())
    }
    #[cfg(desktop)]
    {
        use tauri::{webview::DownloadEvent, WebviewUrl, WebviewWindowBuilder};
        let url = tauri::Url::parse(&url).map_err(|_| "Invalid website URL")?;
        if url.scheme() != "https"
            || url.host_str().is_none()
            || !url.username().is_empty()
            || url.password().is_some()
        {
            return Err("Use an HTTPS website URL without embedded credentials".into());
        }
        if let Some(browser) = app.get_webview_window("zlibrary-browser") {
            if navigate {
                browser.navigate(url).map_err(|e| e.to_string())?;
            }
            browser.show().map_err(|e| e.to_string())?;
            return browser.set_focus().map_err(|e| e.to_string());
        }
        let downloads = root(&app)?;
        fs::create_dir_all(&downloads).map_err(|e| e.to_string())?;
        let handle = app.clone();
        let requests = std::sync::Mutex::new(Vec::<(String, PathBuf, String)>::new());
        let builder = WebviewWindowBuilder::new(&app, "zlibrary-browser", WebviewUrl::External(url))
            .title("Z-Library · Readest")
            .inner_size(1100.0, 800.0)
            .on_navigation(|url| url.scheme() == "https")
            // Keep target=_blank links in this browser so the download handler applies.
            .initialization_script("window.open = (url) => { if (url) location.href = new URL(url, location.href).href; return null; }; document.addEventListener('click', e => { const a = e.target.closest?.('a[target]'); if (a) a.target = '_self'; }, true);")
            .on_download(move |_, event| {
                match event {
                    DownloadEvent::Requested { url, destination } => {
                        let filename = destination.file_name().and_then(|s| s.to_str()).unwrap_or("book").to_string();
                        if !supported(&filename) {
                            let _ = handle.emit_to("main", "zlibrary-download", Download { id: format!("rejected-{}", NEXT_DOWNLOAD.fetch_add(1, Ordering::Relaxed)), filename, path: None, status: "unsupported".into() });
                            return false;
                        }
                        let timestamp = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_nanos();
                        let id = format!("{}-{}", timestamp, NEXT_DOWNLOAD.fetch_add(1, Ordering::Relaxed));
                        let dir = downloads.join(&id);
                        if fs::create_dir(&dir).is_err() {
                            let _ = handle.emit_to("main", "zlibrary-download", Download { id, filename, path: None, status: "failed".into() });
                            return false;
                        }
                        *destination = dir.join(&filename);
                        let Ok(mut active) = requests.lock() else { return false; };
                        active.push((url.to_string(), destination.clone(), id.clone()));
                        let _ = handle.emit_to("main", "zlibrary-download", Download { id, filename, path: None, status: "downloading".into() });
                    }
                    DownloadEvent::Finished { url, path, success } => {
                        let Ok(mut active) = requests.lock() else { return true; };
                        let Some(index) = active.iter().position(|request| {
                            path.as_ref().map_or(request.0 == url.as_str(), |path| path == &request.1)
                        }) else { return true; };
                        let (_, requested_path, id) = active.remove(index);
                        drop(active);
                        let path = path.unwrap_or(requested_path);
                        let Some(dir) = path.parent() else { return true; };
                        if dir.parent() != Some(downloads.as_path()) { return true; }
                        let filename = path.file_name().unwrap_or_default().to_string_lossy().into_owned();
                        let status = if success && path.is_file() && fs::write(dir.join(".ready"), b"").is_ok() { "ready" } else { "failed" };
                        let _ = handle.emit_to("main", "zlibrary-download", Download { id, filename, path: None, status: status.into() });
                    }
                    _ => (),
                }
                true
            });
        // WebView2 shares an environment with the main window. Its options
        // must match, including the overlay scrollbar style (0x8007139F).
        #[cfg(target_os = "windows")]
        let builder = builder.scroll_bar_style(tauri::webview::ScrollBarStyle::FluentOverlay);
        builder.build().map_err(|e| e.to_string())?;
        Ok(())
    }
}

#[tauri::command]
pub fn pending_zlibrary_downloads<R: tauri::Runtime>(
    app: AppHandle<R>,
    window: WebviewWindow<R>,
) -> Result<Vec<Download>, String> {
    trusted(&window)?;
    let root = root(&app)?;
    if !root.exists() {
        return Ok(vec![]);
    }
    let mut pending = vec![];
    for entry in fs::read_dir(root).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        if !entry.file_type().map_err(|e| e.to_string())?.is_dir() {
            continue;
        }
        let dir = entry.path();
        if !dir.join(".ready").is_file() {
            continue;
        }
        for file in fs::read_dir(&dir).map_err(|e| e.to_string())? {
            let file = file.map_err(|e| e.to_string())?;
            let filename = file.file_name().to_string_lossy().into_owned();
            if file.file_type().map_err(|e| e.to_string())?.is_file() && supported(&filename) {
                let path = file.path();
                super::allow_dir_in_scopes(&app, &dir);
                pending.push(Download {
                    id: entry.file_name().to_string_lossy().into_owned(),
                    filename,
                    path: Some(path.to_string_lossy().into_owned()),
                    status: "ready".into(),
                });
            }
        }
    }
    Ok(pending)
}

#[tauri::command]
pub fn acknowledge_zlibrary_download<R: tauri::Runtime>(
    app: AppHandle<R>,
    window: WebviewWindow<R>,
    id: String,
) -> Result<(), String> {
    trusted(&window)?;
    if id.is_empty() || !id.bytes().all(|c| c.is_ascii_digit() || c == b'-') {
        return Err("Invalid download ID".into());
    }
    let dir = root(&app)?.join(id);
    // Only retire the marker after persistence. Keep the original download for recovery.
    let marker = dir.join(".ready");
    if marker.exists() {
        fs::remove_file(marker).map_err(|e| e.to_string())?;
    }
    Ok(())
}
