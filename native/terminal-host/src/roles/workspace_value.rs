//! Bounded MessagePack values for native control routing; binary terminal payloads remain native.

use serde::de::{MapAccess, SeqAccess, Visitor};
use serde::ser::{SerializeMap, SerializeSeq};
use serde::{Deserialize, Deserializer, Serialize, Serializer};
use std::collections::HashSet;
use std::fmt;

#[derive(Clone, Debug, PartialEq)]
pub enum Value {
    Nil,
    Bool(bool),
    I64(i64),
    U64(u64),
    F32(f32),
    F64(f64),
    String(String),
    Bytes(Vec<u8>),
    Array(Vec<Value>),
    Map(Vec<(Value, Value)>),
}
impl Value {
    pub fn get(&self, name: &str) -> Option<&Self> {
        if let Self::Map(entries) = self {
            entries
                .iter()
                .find_map(|(key, value)| (key.text() == Some(name)).then_some(value))
        } else {
            None
        }
    }
    pub fn get_mut(&mut self, name: &str) -> Option<&mut Self> {
        if let Self::Map(entries) = self {
            entries
                .iter_mut()
                .find_map(|(key, value)| (key.text() == Some(name)).then_some(value))
        } else {
            None
        }
    }
    pub fn text(&self) -> Option<&str> {
        if let Self::String(value) = self {
            Some(value)
        } else {
            None
        }
    }
    pub fn set_text(&mut self, name: &str, value: String) {
        if let Some(field) = self.get_mut(name) {
            *field = Self::String(value);
        }
    }
}
impl Serialize for Value {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Nil => serializer.serialize_unit(),
            Self::Bool(v) => serializer.serialize_bool(*v),
            Self::I64(v) => serializer.serialize_i64(*v),
            Self::U64(v) => serializer.serialize_u64(*v),
            Self::F32(v) => serializer.serialize_f32(*v),
            Self::F64(v) => serializer.serialize_f64(*v),
            Self::String(v) => serializer.serialize_str(v),
            Self::Bytes(v) => serializer.serialize_bytes(v),
            Self::Array(values) => {
                let mut seq = serializer.serialize_seq(Some(values.len()))?;
                for v in values {
                    seq.serialize_element(v)?;
                }
                seq.end()
            }
            Self::Map(values) => {
                let mut map = serializer.serialize_map(Some(values.len()))?;
                for (k, v) in values {
                    map.serialize_entry(k, v)?;
                }
                map.end()
            }
        }
    }
}
impl<'de> Deserialize<'de> for Value {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        struct ValueVisitor;
        impl<'de> Visitor<'de> for ValueVisitor {
            type Value = Value;
            fn expecting(&self, f: &mut fmt::Formatter) -> fmt::Result {
                f.write_str("a bounded native MessagePack value")
            }
            fn visit_unit<E>(self) -> Result<Value, E> {
                Ok(Value::Nil)
            }
            fn visit_none<E>(self) -> Result<Value, E> {
                Ok(Value::Nil)
            }
            fn visit_bool<E>(self, v: bool) -> Result<Value, E> {
                Ok(Value::Bool(v))
            }
            fn visit_i64<E>(self, v: i64) -> Result<Value, E> {
                Ok(Value::I64(v))
            }
            fn visit_u64<E>(self, v: u64) -> Result<Value, E> {
                Ok(Value::U64(v))
            }
            fn visit_f32<E>(self, v: f32) -> Result<Value, E> {
                Ok(Value::F32(v))
            }
            fn visit_f64<E>(self, v: f64) -> Result<Value, E> {
                Ok(Value::F64(v))
            }
            fn visit_str<E>(self, v: &str) -> Result<Value, E> {
                Ok(Value::String(v.into()))
            }
            fn visit_string<E>(self, v: String) -> Result<Value, E> {
                Ok(Value::String(v))
            }
            fn visit_bytes<E>(self, v: &[u8]) -> Result<Value, E> {
                Ok(Value::Bytes(v.into()))
            }
            fn visit_byte_buf<E>(self, v: Vec<u8>) -> Result<Value, E> {
                Ok(Value::Bytes(v))
            }
            fn visit_seq<A: SeqAccess<'de>>(self, mut seq: A) -> Result<Value, A::Error> {
                let mut values = Vec::new();
                while let Some(value) = seq.next_element()? {
                    values.push(value);
                }
                Ok(Value::Array(values))
            }
            fn visit_map<A: MapAccess<'de>>(self, mut map: A) -> Result<Value, A::Error> {
                let mut values = Vec::new();
                let mut keys = HashSet::new();
                while let Some((key, value)) = map.next_entry::<Value, Value>()? {
                    if let Value::String(name) = &key
                        && !keys.insert(name.clone())
                    {
                        return Err(serde::de::Error::custom("duplicate native routing field"));
                    }
                    values.push((key, value));
                }
                Ok(Value::Map(values))
            }
        }
        deserializer.deserialize_any(ValueVisitor)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn every_pinned_protocol_fixture_preserves_binary_and_optional_data() {
        for (_, frame) in crate::protocol::fixture_set().unwrap() {
            let envelope: crate::protocol::Envelope<Value> =
                crate::protocol::decode_frame(&frame).unwrap();
            let encoded = crate::protocol::encode_frame(&envelope).unwrap();
            assert_eq!(frame, encoded);
        }
    }
}
