use crate::models::quality::CookiesBrowser;
use crate::models::download::DownloadOptions;
use crate::validators::path::SafePath;
use crate::validators::url::ValidatedUrl;

pub fn build_info_args(url: &ValidatedUrl, cookies_browser: &CookiesBrowser) -> Vec<String> {
    let mut args = vec![
        "--dump-json".to_string(),
        "--no-playlist".to_string(),
    ];

    append_cookies_args(&mut args, cookies_browser);

    args.push(url.as_str().to_string());
    args
}

pub fn build_download_args(
    url: &ValidatedUrl,
    options: &DownloadOptions,
    output_dir: &SafePath,
) -> Vec<String> {
    let mut args: Vec<String> = options
        .quality
        .ytdlp_flags()
        .iter()
        .map(|s| s.to_string())
        .collect();

    let output_template = format!(
        "{}/%(title)s.%(ext)s",
        output_dir.as_path().display()
    );
    args.push("--output".to_string());
    args.push(output_template);

    if options.embed_thumbnail {
        args.push("--embed-thumbnail".to_string());
    }

    if options.embed_metadata {
        args.push("--embed-metadata".to_string());
    }

    append_cookies_args(&mut args, &options.cookies_browser);

    args.push("--newline".to_string());
    args.push("--no-playlist".to_string());
    args.push(url.as_str().to_string());

    args
}

fn append_cookies_args(args: &mut Vec<String>, cookies_browser: &CookiesBrowser) {
    let browser_name = match cookies_browser {
        CookiesBrowser::None => return,
        CookiesBrowser::Chrome => "chrome",
        CookiesBrowser::Firefox => "firefox",
        CookiesBrowser::Safari => "safari",
        CookiesBrowser::Edge => "edge",
        CookiesBrowser::Brave => "brave",
    };
    args.push("--cookies-from-browser".to_string());
    args.push(browser_name.to_string());
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::quality::QualityPreset;

    fn test_url() -> ValidatedUrl {
        ValidatedUrl::new("https://www.youtube.com/watch?v=dQw4w9WgXcQ").unwrap()
    }

    fn test_safe_path() -> SafePath {
        // Use temp dir which exists and is absolute
        let tmp = std::env::temp_dir();
        let canonical = std::fs::canonicalize(&tmp).unwrap();
        SafePath::new(
            &canonical.to_string_lossy(),
            &[canonical.clone()],
        )
        .unwrap()
    }

    fn test_options(quality: QualityPreset) -> DownloadOptions {
        DownloadOptions {
            download_id: "test-id".to_string(),
            url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ".to_string(),
            quality,
            output_dir: std::env::temp_dir().to_string_lossy().to_string(),
            embed_thumbnail: false,
            embed_metadata: false,
            cookies_browser: CookiesBrowser::None,
        }
    }

    #[test]
    fn info_args_contain_dump_json_and_url() {
        let url = test_url();
        let args = build_info_args(&url, &CookiesBrowser::None);
        assert!(args.contains(&"--dump-json".to_string()));
        assert!(args.contains(&"--no-playlist".to_string()));
        assert_eq!(args.last().unwrap(), url.as_str());
    }

    #[test]
    fn info_args_with_cookies() {
        let url = test_url();
        let args = build_info_args(&url, &CookiesBrowser::Chrome);
        assert!(args.contains(&"--cookies-from-browser".to_string()));
        assert!(args.contains(&"chrome".to_string()));
    }

    #[test]
    fn download_args_best_quality() {
        let url = test_url();
        let options = test_options(QualityPreset::Best);
        let output_dir = test_safe_path();
        let args = build_download_args(&url, &options, &output_dir);
        assert!(args.contains(&"-f".to_string()));
        assert!(args.contains(&"--newline".to_string()));
        assert!(args.contains(&"--no-playlist".to_string()));
        assert_eq!(args.last().unwrap(), url.as_str());
    }

    #[test]
    fn download_args_audio_quality() {
        let url = test_url();
        let options = test_options(QualityPreset::Audio);
        let output_dir = test_safe_path();
        let args = build_download_args(&url, &options, &output_dir);
        assert!(args.contains(&"-x".to_string()));
        assert!(args.contains(&"--audio-format".to_string()));
    }

    #[test]
    fn download_args_with_embed_options() {
        let url = test_url();
        let mut options = test_options(QualityPreset::Q1080);
        options.embed_thumbnail = true;
        options.embed_metadata = true;
        let output_dir = test_safe_path();
        let args = build_download_args(&url, &options, &output_dir);
        assert!(args.contains(&"--embed-thumbnail".to_string()));
        assert!(args.contains(&"--embed-metadata".to_string()));
    }

    #[test]
    fn download_args_output_template_contains_dir() {
        let url = test_url();
        let options = test_options(QualityPreset::Best);
        let output_dir = test_safe_path();
        let args = build_download_args(&url, &options, &output_dir);
        let output_arg_idx = args.iter().position(|a| a == "--output").unwrap();
        let template = &args[output_arg_idx + 1];
        assert!(template.contains("%(title)s.%(ext)s"));
    }

    #[test]
    fn download_args_with_cookies_browser() {
        let url = test_url();
        let mut options = test_options(QualityPreset::Best);
        options.cookies_browser = CookiesBrowser::Firefox;
        let output_dir = test_safe_path();
        let args = build_download_args(&url, &options, &output_dir);
        assert!(args.contains(&"--cookies-from-browser".to_string()));
        assert!(args.contains(&"firefox".to_string()));
    }

    #[test]
    fn all_quality_presets_produce_valid_args() {
        let url = test_url();
        let output_dir = test_safe_path();
        let presets = [
            QualityPreset::Best,
            QualityPreset::Q2160,
            QualityPreset::Q1080,
            QualityPreset::Q720,
            QualityPreset::Q480,
            QualityPreset::Audio,
        ];
        for preset in presets {
            let options = test_options(preset);
            let args = build_download_args(&url, &options, &output_dir);
            assert!(!args.is_empty());
            assert_eq!(args.last().unwrap(), url.as_str());
        }
    }

    #[test]
    fn no_cookies_when_none() {
        let url = test_url();
        let args = build_info_args(&url, &CookiesBrowser::None);
        assert!(!args.contains(&"--cookies-from-browser".to_string()));
    }
}
