#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct ZigTarget {
    pub triple: &'static str,
    pub cpu: &'static str,
}

pub const BASELINE_CPU: &str = "baseline";

pub fn resolve(cargo_target: &str) -> Option<ZigTarget> {
    let triple = match cargo_target {
        "x86_64-pc-windows-msvc" => "x86_64-windows-msvc",
        "x86_64-unknown-linux-gnu" => "x86_64-linux-gnu",
        "aarch64-apple-darwin" => "aarch64-macos",
        "x86_64-apple-darwin" => "x86_64-macos",
        _ => return None,
    };
    Some(ZigTarget {
        triple,
        cpu: BASELINE_CPU,
    })
}

#[cfg(test)]
mod tests {
    use super::{BASELINE_CPU, ZigTarget, resolve};

    #[test]
    fn maps_every_supported_cargo_target_to_a_zig_baseline() {
        for (cargo, triple) in [
            ("x86_64-pc-windows-msvc", "x86_64-windows-msvc"),
            ("x86_64-unknown-linux-gnu", "x86_64-linux-gnu"),
            ("aarch64-apple-darwin", "aarch64-macos"),
            ("x86_64-apple-darwin", "x86_64-macos"),
        ] {
            assert_eq!(
                resolve(cargo),
                Some(ZigTarget {
                    triple,
                    cpu: BASELINE_CPU,
                })
            );
        }
    }

    #[test]
    fn rejects_targets_outside_the_supported_matrix() {
        assert_eq!(resolve("aarch64-pc-windows-msvc"), None);
        assert_eq!(resolve("x86_64-unknown-linux-musl"), None);
    }
}
