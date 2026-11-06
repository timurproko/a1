/// Distinguish an exited process from an inaccessible live owner after native inspection fails.
pub(super) fn inspection_proves_exit(
    error_code: Option<i32>,
    no_such_process: i32,
    process_exists: impl FnOnce() -> bool,
) -> bool {
    error_code == Some(no_such_process) || !process_exists()
}

#[cfg(test)]
mod tests {
    use super::inspection_proves_exit;

    // Platform: these are supplied errno values, not the test host's native error constants.
    const ESRCH: i32 = 3;

    #[test]
    fn no_such_process_is_gone_even_while_the_pid_is_queryable() {
        assert!(inspection_proves_exit(Some(ESRCH), ESRCH, || true));
    }

    #[test]
    fn definitive_native_exit_does_not_consult_a_racy_fallback() {
        assert!(inspection_proves_exit(Some(ESRCH), ESRCH, || {
            panic!("a later PID probe must not override native exit evidence")
        }));
    }

    #[test]
    fn permission_io_and_unknown_failures_preserve_live_owners() {
        for error in [Some(1), Some(13), Some(5), None] {
            assert!(!inspection_proves_exit(error, ESRCH, || true));
        }
    }

    #[test]
    fn an_independent_exit_probe_can_confirm_disappearance() {
        for error in [Some(ESRCH), Some(1), Some(13), Some(5), None] {
            assert!(inspection_proves_exit(error, ESRCH, || false));
        }
    }
}
