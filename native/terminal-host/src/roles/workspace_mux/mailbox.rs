//! One bounded latest-intent slot; slow storage never makes ordinary tab actions overflow a FIFO.
use super::*;
use std::sync::{Condvar, Mutex};

#[derive(Default)]
pub(super) struct Mailbox {
    pending: Mutex<Option<Persistence>>,
    changed: Condvar,
}
impl Mailbox {
    pub(super) fn submit(&self, mut update: Persistence) -> Result<(), String> {
        let mut pending = self
            .pending
            .lock()
            .map_err(|_| "workspace persistence coordination failed")?;
        if let Some(current) = pending.as_mut() {
            if update.selected.is_some() {
                current.selected = update.selected.take();
            }
            if !update.order.is_empty() {
                current.order = std::mem::take(&mut update.order);
            }
            if update.view.is_some() {
                current.view = update.view;
            }
            for route in update.routes {
                current
                    .routes
                    .retain(|prior| prior.source_scope() != route.source_scope());
                current.routes.push(route);
            }
            if current.routes.len() > MAX_SOURCES {
                return Err("workspace source capacity exceeded".into());
            }
        } else {
            *pending = Some(update);
        }
        self.changed.notify_one();
        Ok(())
    }
    pub(super) fn take(&self, stop: &AtomicBool) -> Option<Persistence> {
        let mut pending = self.pending.lock().ok()?;
        loop {
            if stop.load(Ordering::Acquire) {
                return None;
            }
            if let Some(update) = pending.take() {
                return Some(update);
            }
            pending = self
                .changed
                .wait_timeout(pending, Duration::from_millis(50))
                .ok()?
                .0;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn rapid_selection_and_order_changes_keep_only_the_latest_intent_without_refusal() {
        let mailbox = Mailbox::default();
        for index in 0..10000 {
            mailbox
                .submit(Persistence {
                    selected: Some(format!("tab-{index}")),
                    order: vec![format!("order-{index}")],
                    routes: vec![],
                    view: Some(index),
                })
                .unwrap();
        }
        let update = mailbox.take(&AtomicBool::new(false)).unwrap();
        assert_eq!(update.selected.as_deref(), Some("tab-9999"));
        assert_eq!(update.order, ["order-9999"]);
        assert_eq!(update.view, Some(9999));
        assert!(mailbox.pending.lock().unwrap().is_none());
    }
    #[test]
    fn background_metadata_does_not_erase_a_pending_view_or_latest_order() {
        let mailbox = Mailbox::default();
        mailbox
            .submit(Persistence {
                selected: Some("selected".into()),
                order: vec!["last".into()],
                routes: vec![],
                view: Some(12),
            })
            .unwrap();
        mailbox
            .submit(Persistence {
                selected: None,
                order: vec![],
                routes: vec![],
                view: None,
            })
            .unwrap();
        let update = mailbox.take(&AtomicBool::new(false)).unwrap();
        assert_eq!(update.selected.as_deref(), Some("selected"));
        assert_eq!(update.order, ["last"]);
        assert_eq!(update.view, Some(12));
    }
    #[test]
    fn disposal_does_not_drain_stale_persistence_after_the_client_has_left() {
        let mailbox = Mailbox::default();
        assert!(mailbox.take(&AtomicBool::new(true)).is_none());
    }
}
