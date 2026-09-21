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
      $.function_declaration,
      $.partial_function_declaration,
      $.type_synonym_declaration,
      $.exception_declaration,
      $.interface_declaration,
    ),

    datatype_declaration: $ => seq(
      optional(field("annotations", $.annotations)),
      "data",
      field("name", $.qualified_type_identifier),
      optional(field("parameters", $.type_parameters)),
      optional(field("constructors", $.data_constructor_clause)),
      ";",
    ),

    type_parameters: $ => seq(
      "<",
      commaSep1($.type_identifier),
      ">"
    ),

    data_constructor_clause: $ => seq(
      "=",
      barSep1($.data_constructor),
    ),

    data_constructor: $ => seq(
      field("name", $.type_identifier),
      optional(field("parameters", $.data_constructor_parameters)),
    ),

    data_constructor_parameters: $ => seq(
      "(",
      commaSep1($.data_constructor_parameter),
      ")",
    ),

    data_constructor_parameter: $ => seq(
      field("type", $.type_use),
      optional(field("name", $.identifier)),
    ),

    function_declaration: $ => seq(
      optional(field("annotations", $.annotations)),
      "def",
      field("return_type", $.type_use),
      field("name", $.qualified_identifier),
      optional(field("type_parameters", $.type_parameters)),
      field("parameters", $.parameters),
      "=",
      field("expression", choice(
        $.builtin_expression,
        $.pure_expression,
      )),
      ";"
    ),

    // Question about annotations vs annotation* in ANTLR grammar
    // FIXME: Improve parsing of annotation*
    partial_function_declaration: $ => seq(
      repeat($.annotation),
      "def",
      field("return_type", $.type_use),
      field("name", $.qualified_identifier),
      optional(field("type_parameters", $.type_parameters)),
      field("functions", $.function_name_list),
      field("parameters", $.parameters),
      "=",
      field("expression", $.pure_expression),
      ";",
    ),

    type_synonym_declaration: $ => seq(
      optional(field("annotations", $.annotations)),
      "type",
      field("name", $.qualified_type_identifier),
      "=",
      field("type", $.type_use),
      ";",
    ),

    exception_declaration: $ => seq(
      optional(field("annotations", $.annotations)),
      "exception",
      field("name", $.qualified_type_identifier),
      optional(field("parameters", $.data_constructor_parameters)),
      ";",
    ),

    interface_declaration: $ => seq(
      optional(field("annotations", $.annotations)),
      "interface",
      field("name", $.qualified_type_identifier),
      optional(field("extends", $.extends_clause)),
      field("body", $.interface_body),
    ),

    extends_clause: $ => seq(
      "extends",
      commaSep1($._interface_name),
    ),

    interface_body: $ => seq(
      "{",
      repeat($.method_signature),
      "}",
    ),

    method_signature: $ => seq(
      field("return_type", $.type_use),
      field("name", $.identifier),
      field("parameters", $.parameters),
      ";"
    ),

    parameters: $ => seq(
      "(",
      commaSep($.parameter),
      ")",
    ),

    parameter: $ => seq(
      optional(field("annotations", $.annotations)),
      field("type", $.type_expression),
      field("name", $.identifier),
    ),

    module_declaration: $ => seq(
      "module",
      field("name", $.qualified_type_identifier),
      ";",
      // TODO: Add exports and imports
      repeat($.declaration)
    ),

    word: $ => $.identifier,

    identifier: _ => seq(
      /[a-z][A-Za-z0-9_]*/
    ),

    type_identifier: _ => seq(
      /[A-Z][A-Za-z0-9_]*/
    ),

    qualified_identifier: $ => seq(
      dotSep($.type_identifier),
      $.identifier,
    ),

    qualified_type_identifier: $ => dotSep1($.type_identifier),

    // Name inherited from ANTLR grammar
    // type_use is a type_expressions with possible annotations
    type_use: $ => seq(
      optional($.annotations),
      field("name", $.qualified_type_identifier),
      optional(field("parameters", $.type_use_parameters)),
    ),

    type_expression: $ => seq(
      field("name", $.qualified_type_identifier),
      optional(field("parameters", $.type_use_parameters)),
    ),

    type_use_parameters: $ => seq(
      "<",
      commaSep1($.type_use),
      ">",
    ),

    function_name_list: $ => seq(
      "(",
      commaSep($._function_name_decl),
      ")",
    ),


    expression: $ => choice(
      $.pure_expression,
    ),

    pure_expression: $ => seq("TODO"),

    builtin_expression: $ => seq(
      "builtin",
      "(",
      commaSep($.pure_expression),
      ")",
    ),

    // Overrides
    _function_name_decl: $ => $.identifier,
    _interface_name: $ => $.qualified_type_identifier,

    annotations: $ => repeat1(seq(
      "[",
      commaSep1($.annotation),
      "]",
    )),

    // FIXME: Add fields
    annotation: $ => seq(
      optional(seq(
        $.type_identifier,
        ":")),
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
