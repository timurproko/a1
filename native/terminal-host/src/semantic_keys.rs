//! Key identities shared by the attach client, which names the outer terminal's keys, and the
//! holder, which encodes them with libghostty against the viewed child's terminal modes.
//!
//! Names follow the libghostty key table in kebab-case so a parity fixture can state them
//! literally; the numeric codes are the `GhosttyKey` enum values of the vendored library.

use crate::protocol::{MOD_ALT, MOD_CTRL, MOD_SHIFT};

/// The name of a key the outer terminal could not identify; such events carry only text.
pub const UNIDENTIFIED: &str = "unidentified";

const LETTERS: [&str; 26] = [
    "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s",
    "t", "u", "v", "w", "x", "y", "z",
];
const DIGITS: [&str; 10] = [
    "digit-0", "digit-1", "digit-2", "digit-3", "digit-4", "digit-5", "digit-6", "digit-7",
    "digit-8", "digit-9",
];
const FUNCTION_KEYS: [&str; 25] = [
    "f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8", "f9", "f10", "f11", "f12", "f13", "f14", "f15",
    "f16", "f17", "f18", "f19", "f20", "f21", "f22", "f23", "f24", "f25",
];
const NAMED: &[(&str, i32)] = &[
    ("backquote", 1),
    ("backslash", 2),
    ("bracket-left", 3),
    ("bracket-right", 4),
    ("comma", 5),
    ("equal", 16),
    ("intl-backslash", 17),
    ("intl-ro", 18),
    ("intl-yen", 19),
    ("minus", 46),
    ("period", 47),
    ("quote", 48),
    ("semicolon", 49),
    ("slash", 50),
    ("backspace", 53),
    ("enter", 58),
    ("space", 63),
    ("tab", 64),
    ("delete", 68),
    ("end", 69),
    ("home", 71),
    ("insert", 72),
    ("page-down", 73),
    ("page-up", 74),
    ("arrow-down", 75),
    ("arrow-left", 76),
    ("arrow-right", 77),
    ("arrow-up", 78),
    ("escape", 120),
];
const KEY_A: i32 = 20;
const KEY_DIGIT_0: i32 = 6;
const KEY_F1: i32 = 121;

/// The libghostty key code for a semantic key name, or `None` for an unknown name.
pub fn key_code(name: &str) -> Option<i32> {
    if name == UNIDENTIFIED {
        return Some(0);
    }
    if let Some(index) = LETTERS.iter().position(|letter| *letter == name) {
        return Some(KEY_A + index as i32);
    }
    if let Some(index) = DIGITS.iter().position(|digit| *digit == name) {
        return Some(KEY_DIGIT_0 + index as i32);
    }
    if let Some(index) = FUNCTION_KEYS.iter().position(|key| *key == name) {
        return Some(KEY_F1 + index as i32);
    }
    NAMED
        .iter()
        .find(|(candidate, _)| *candidate == name)
        .map(|(_, code)| *code)
}

/// The semantic key name for a character key as reported by the outer terminal, or `None` when
/// the character has no physical key identity and must travel as text.
pub fn key_name_for_char(character: char) -> Option<&'static str> {
    match character {
        'a'..='z' => Some(LETTERS[(character as u8 - b'a') as usize]),
        'A'..='Z' => Some(LETTERS[(character as u8 - b'A') as usize]),
        '0'..='9' => Some(DIGITS[(character as u8 - b'0') as usize]),
        ' ' => Some("space"),
        '-' | '_' => Some("minus"),
        '=' | '+' => Some("equal"),
        ',' | '<' => Some("comma"),
        '.' | '>' => Some("period"),
        '/' | '?' => Some("slash"),
        '\\' | '|' => Some("backslash"),
        ';' | ':' => Some("semicolon"),
        '\'' | '"' => Some("quote"),
        '`' | '~' => Some("backquote"),
        '[' | '{' => Some("bracket-left"),
        ']' | '}' => Some("bracket-right"),
        _ => None,
    }
}

/// The semantic name of a function key number, or `None` outside the supported range.
pub fn function_key_name(number: u8) -> Option<&'static str> {
    FUNCTION_KEYS
        .get(usize::from(number).checked_sub(1)?)
        .copied()
}

/// True when a normalized key identifies the plain `Ctrl+C` chord that the clear/exit contract
/// counts, independent of the representation the outer terminal chose for it.
pub fn is_plain_ctrl_c(key: &str, mods: u8, text: Option<&str>) -> bool {
    let ctrl_only = mods & (MOD_CTRL | MOD_ALT | MOD_SHIFT) == MOD_CTRL;
    (key == "c" && ctrl_only) || (key == UNIDENTIFIED && text == Some("\u{3}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn names_round_trip_to_the_libghostty_key_table() {
        assert_eq!(key_code("a"), Some(20));
        assert_eq!(key_code("z"), Some(45));
        assert_eq!(key_code("digit-0"), Some(6));
        assert_eq!(key_code("digit-9"), Some(15));
        assert_eq!(key_code("enter"), Some(58));
        assert_eq!(key_code("escape"), Some(120));
        assert_eq!(key_code("f1"), Some(121));
        assert_eq!(key_code("f25"), Some(145));
        assert_eq!(key_code(UNIDENTIFIED), Some(0));
        assert_eq!(key_code("f26"), None);
        assert_eq!(key_code("Enter"), None);
        for (name, code) in NAMED {
            assert_eq!(key_code(name), Some(*code), "{name}");
        }
    }

    #[test]
    fn characters_map_to_physical_keys_with_shift_folded_into_text() {
        assert_eq!(key_name_for_char('A'), Some("a"));
        assert_eq!(key_name_for_char('7'), Some("digit-7"));
        assert_eq!(key_name_for_char('?'), Some("slash"));
        assert_eq!(key_name_for_char('{'), Some("bracket-left"));
        assert_eq!(key_name_for_char(' '), Some("space"));
        assert_eq!(key_name_for_char('é'), None);
        assert_eq!(key_name_for_char('开'), None);
        assert_eq!(function_key_name(2), Some("f2"));
        assert_eq!(function_key_name(0), None);
        assert_eq!(function_key_name(26), None);
    }

    #[test]
    fn plain_ctrl_c_is_recognized_from_identity_not_representation() {
        assert!(is_plain_ctrl_c("c", MOD_CTRL, Some("c")));
        assert!(is_plain_ctrl_c("c", MOD_CTRL, None));
        assert!(is_plain_ctrl_c(UNIDENTIFIED, 0, Some("\u{3}")));
        assert!(!is_plain_ctrl_c("c", MOD_CTRL | MOD_SHIFT, Some("C")));
        assert!(!is_plain_ctrl_c("c", MOD_CTRL | MOD_ALT, Some("c")));
        assert!(!is_plain_ctrl_c("c", 0, Some("c")));
        assert!(!is_plain_ctrl_c("d", MOD_CTRL, Some("d")));
    }
}
