/**
 * @file ABS grammar for tree-sitter
 * @author Sebastian Aschim Wilt <wilt.sebastian@gmail.com>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar({
  name: "abs",

  extras: ($) => [
    /[\s\f]/, // Whitespace
    $.comment
  ],

  supertypes: ($) => [
    $.declaration
  ],


  rules: {
    // TODO: add the actual grammar rules
    source_file: $ => repeat($.module_declaration),

    declaration: $ => choice(
      $.datatype_declaration,
    ),

    datatype_declaration: $ => seq(
      optional($.annotations),
      "data",
      field("name", $.qualified_type_identifier),
      optional(field("parameters", $.type_parameters)),
      optional(field("constructors", $.data_constructor_clause)),
      ";",
    ),

    type_parameters: $ => seq(
      "<",
      commaSep1($.type_identifier),
      ">"
    ),

    data_constructor_clause: $ => seq(
      "=",
      barSep1($.data_constructor),
    ),

    data_constructor: $ => seq(
      field("name", $.type_identifier),
      optional(field("parameters", $.data_constructor_parameters)),
    ),

    data_constructor_parameters: $ => seq(
      "(",
      commaSep1($.data_constructor_parameter),
      ")",
    ),

    data_constructor_parameter: $ => seq(
      field("type", $.type_use),
      optional(field("name", $.identifier)),
    ),

    module_declaration: $ => seq(
      "module",
      field("name", $.qualified_type_identifier),
      ";",
      // TODO: Add exports and imports
      repeat($.declaration)
    ),

    identifier: _ => seq(
      /[a-z][A-Za-z0-9_]*/
    ),

    type_identifier: _ => seq(
      /[A-Z][A-Za-z0-9_]*/
    ),

    qualified_type_identifier: $ => dotSep1($.type_identifier),

    // Name inherited from ANTLR grammar
    // type_use is a ... with annotations
    type_use: $ => seq(
      optional($.annotations),
      field("name", $.qualified_type_identifier),
      optional(field("parameters", $.type_use_parameters)),
    ),

    type_use_parameters: $ => seq(
      "<",
      commaSep1($.type_use),
      ">",
    ),

    expression: $ => choice(
      $.pure_expression,
    ),

    pure_expression: $ => seq("TODO"),

    annotations: $ => repeat1(seq(
      "[",
      commaSep1($.annotation),
      "]",
    )),

    annotation: $ => seq(
      $.type_identifier,
      ":",
      $.pure_expression,
    ),

    // Difference from ABS grammar (ANTLR)
    // https://github.com/abstools/abstools/blob/master/frontend/src/main/antlr/org/abs_models/frontend/antlr/parser/ABS.g4
    comment: _ => token(choice(
      seq("//", /[^\r\n]*/),
      seq(
        '/*',
        /[^*]*\*+([^/*][^*]*\*+)*/,
        '/',
      ),
    ))
  }
});


function dotSep1(rule) {
  return seq(rule, repeat(seq('.', rule)));
}

function dotSep(rule) {
  return optional(dotSep1(rule));
}

function commaSep1(rule) {
  return seq(rule, repeat(seq(",", rule)));
}

function commaSep(rule) {
  return optional(commaSep1(rule));
}

function barSep1(rule) {
  return seq(rule, repeat(seq("|", rule)));
}
