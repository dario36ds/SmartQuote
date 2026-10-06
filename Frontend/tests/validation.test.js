import assert from "node:assert/strict";
import test from "node:test";

import { validateInput, validatePhone } from "../src/utils/validation.js";

test("accepts optional phones and formatted national and international numbers", () => {
  for (const value of ["", "  ", "3331234567", "02 1234 5678", "+39 333 123 4567", "0039 333 123 4567", "+44 (20) 7946-0958", "333.123.4567"]) assert.equal(validatePhone(value), "", value);
});

test("rejects malformed phones", () => {
  for (const value of ["abc", "333abc1234567", "123", "+", "++393331234567", "39+3331234567", "+0393331234567", "0003331234567", "1234567890123456", "(3331234567", ")3331234567(", "((333))1234567", "333/123/4567", "333\n1234567"]) assert.notEqual(validatePhone(value), "", value);
});

test("checks emails without requiring optional contact data", () => {
  const options = { type: "email", maxLength: 254 };
  for (const value of ["", "mario@example.it", " mario.rossi+preventivi@example.it "]) assert.equal(validateInput(value, options), "", value);
  for (const value of ["invalid", "mario@", "mario@localhost", "mario@@example.com", "mario rossi@example.com", "mario..rossi@example.com", ".mario@example.com", "mario.@example.com", "a".repeat(250) + "@example.it"]) assert.notEqual(validateInput(value, options), "", value);
});

test("checks required fields, lengths and usernames without restricting names", () => {
  assert.notEqual(validateInput("  ", { required: true }), "");
  assert.equal(validateInput("Émilie D’Angelo", { required: true, maxLength: 150 }), "");
  assert.notEqual(validateInput("a".repeat(151), { maxLength: 150 }), "");
  assert.equal(validateInput("  ", {}), "");
  assert.equal(validateInput("mario.rossi+1", { name: "username" }), "");
  assert.notEqual(validateInput("mario rossi", { name: "username" }), "");
});

test("checks decimal quantities and prices against range and precision limits", () => {
  const quantity = { type: "number", min: "0.01", max: "99999999.99", step: "0.01", required: true };
  for (const value of ["1", "0.25", "99999999.99"]) assert.equal(validateInput(value, quantity), "", value);
  for (const value of ["", "0", "-1", "0.001", "100000000", "abc", "Infinity"]) assert.notEqual(validateInput(value, quantity), "", value);
  const price = { ...quantity, min: "0" };
  assert.equal(validateInput("0", price), "");
  assert.equal(validateInput("12.50", price), "");
  assert.notEqual(validateInput("12.501", price), "");
});
