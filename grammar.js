/**
 * @file ABS grammar for tree-sitter
 * @author Sebastian Aschim Wilt <wilt.sebastian@gmail.com>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar({
  name: "abs",

  rules: {
    // TODO: add the actual grammar rules
    source_file: $ => "hello"
  }
});
