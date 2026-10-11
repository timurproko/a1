//! Cross-platform contracts used by the resident terminal host.
//!
//! This library deliberately contains no resident server or product wiring. Milestone 1 exposes
//! bounded protocol/core state and operating-system primitives for later roles to consume.

pub mod controller;
pub mod durable;
pub mod endpoint;
pub mod identity;
pub mod launch;
pub mod protocol;
pub mod roles;
pub mod session_lock;

#[cfg(feature = "node-addon")]
mod node_addon;

#[cfg(test)]
#[path = "../build_target.rs"]
mod build_target;
