//! Cross-platform contracts used by the resident terminal host.
//!
//! This library deliberately contains no resident server or product wiring. Milestone 1 exposes
//! bounded protocol/core state and operating-system primitives for later roles to consume.

pub mod controller;
pub mod core;
pub mod durable;
pub mod endpoint;
pub mod fault_injection;
pub mod ghostty;
pub mod identity;
pub mod launch;
pub mod protocol;
pub mod roles;
pub mod session_lock;
pub mod shell;

#[cfg(feature = "node-addon")]
mod node_addon;

#[cfg(test)]
#[path = "../build_target.rs"]
mod build_target;

#[cfg(test)]
#[path = "../build_vt_manifest.rs"]
mod build_vt_manifest;
