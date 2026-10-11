use std::collections::VecDeque;

use crate::protocol::MAX_INPUT_BYTES;

pub const HOLDER_INPUT_CAPACITY: usize = 4 * 1024 * 1024;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum InputAdmissionError {
    Capacity,
    MessageTooLarge,
}

/// The holder reserves a complete paste before exposing any prefix to its writer thread.
#[derive(Debug)]
pub struct BoundedInputQueue {
    queued: usize,
    capacity: usize,
    messages: VecDeque<Vec<u8>>,
}

impl Default for BoundedInputQueue {
    fn default() -> Self {
        Self::new(HOLDER_INPUT_CAPACITY)
    }
}

impl BoundedInputQueue {
    pub fn new(capacity: usize) -> Self {
        Self {
            queued: 0,
            capacity,
            messages: VecDeque::new(),
        }
    }
    pub fn queued_bytes(&self) -> usize {
        self.queued
    }

    pub fn admit_paste(&mut self, bytes: &[u8]) -> Result<usize, InputAdmissionError> {
        if bytes.len() > self.capacity.saturating_sub(self.queued) {
            return Err(InputAdmissionError::Capacity);
        }
        let count = bytes.len().div_ceil(MAX_INPUT_BYTES);
        for chunk in bytes.chunks(MAX_INPUT_BYTES) {
            self.messages.push_back(chunk.to_vec());
            self.queued += chunk.len();
        }
        Ok(count)
    }

    pub fn admit_input(&mut self, bytes: &[u8]) -> Result<(), InputAdmissionError> {
        if bytes.len() > MAX_INPUT_BYTES {
            return Err(InputAdmissionError::MessageTooLarge);
        }
        if bytes.len() > self.capacity.saturating_sub(self.queued) {
            return Err(InputAdmissionError::Capacity);
        }
        self.queued += bytes.len();
        self.messages.push_back(bytes.to_vec());
        Ok(())
    }

    pub fn pop(&mut self) -> Option<Vec<u8>> {
        let bytes = self.messages.pop_front()?;
        self.queued -= bytes.len();
        Some(bytes)
    }
}

/// Bounded retained output used by the holder even while no client is attached.
#[derive(Debug)]
pub struct RetainedOutput {
    bytes: VecDeque<u8>,
    capacity: usize,
    revision: u64,
}

impl RetainedOutput {
    pub fn new(capacity: usize) -> Self {
        Self {
            bytes: VecDeque::new(),
            capacity,
            revision: 0,
        }
    }
    pub fn absorb(&mut self, output: &[u8]) {
        self.revision = self.revision.saturating_add(1);
        self.bytes.extend(output.iter().copied());
        while self.bytes.len() > self.capacity {
            self.bytes.pop_front();
        }
    }
    pub fn snapshot(&self) -> (u64, Vec<u8>) {
        (self.revision, self.bytes.iter().copied().collect())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn over_capacity_paste_delivers_no_prefix() {
        let mut queue = BoundedInputQueue::new(4);
        assert_eq!(
            queue.admit_paste(b"12345"),
            Err(InputAdmissionError::Capacity)
        );
        assert_eq!(queue.queued_bytes(), 0);
        assert_eq!(queue.pop(), None);
    }

    #[test]
    fn admitted_large_paste_is_split_and_ordered() {
        let mut queue = BoundedInputQueue::new(MAX_INPUT_BYTES * 2 + 1);
        let input = vec![7; MAX_INPUT_BYTES + 1];
        assert_eq!(queue.admit_paste(&input), Ok(2));
        let mut output = queue.pop().unwrap();
        output.extend(queue.pop().unwrap());
        assert_eq!(output, input);
    }

    #[test]
    fn output_is_retained_without_a_viewer() {
        let mut retained = RetainedOutput::new(6);
        retained.absorb(b"before");
        retained.absorb(b"-after");
        assert_eq!(retained.snapshot(), (2, b"-after".to_vec()));
    }
}
