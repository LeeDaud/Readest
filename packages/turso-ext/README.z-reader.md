# Z-Reader dependency patch

Vendored from crates.io `turso_ext` 0.6.1, upstream commit
`76af5a1250cd98bb26c13862093a638714b0a3a6`, directory `extensions/core`.
The original MIT license and source are retained.

Only `build.rs` changes: Windows system libraries must be selected from
`CARGO_CFG_TARGET_OS`, rather than `cfg!(target_os = "windows")`. The latter
describes the build-script host and incorrectly links `advapi32` when building
Android from Windows. Windows targets still link the original library.

Remove this patch once the selected upstream release includes this fix.
