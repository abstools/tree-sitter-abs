/**
 * @file ABS grammar for tree-sitter
 * @author Sebastian Aschim Wilt <wilt.sebastian@gmail.com>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const DIGIT = /[0-9]/;
const NONZERO_DIGIT = /[1-9]/;

const DECIMAL_INTEGER = choice(
  "0",
  seq(NONZERO_DIGIT, repeat(DIGIT)),
);

module.exports = grammar({
  name: "abs",

  extras: ($) => [
    /[\s\f]/, // Whitespace
    $.comment
  ],

  supertypes: ($) => [
    $.declaration,
    $.statement,
    $.expression,
    $.pure_expression,
    $.trait_operation,
    $.pattern,
  ],

  word: $ => $.identifier,

  rules: {
    source_file: $ => repeat($.module_declaration),

    main_block: $ => seq(
      optional(field("annotations", $.annotations)),
      "{",
      repeat(field("statement", $.statement)),
      "}",
    ),

    declaration: $ => choice(
      $.datatype_declaration,
      $.function_declaration,
      $.partial_function_declaration,
      $.type_synonym_declaration,
      $.exception_declaration,
      $.interface_declaration,
      $.class_declaration,
      $.trait_declaration,
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
    partial_function_declaration: $ => seq(
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

    type_synonym_declaration: $ => seq(
      optional(field("annotations", $.annotations)),
      "type",
      field("name", $.qualified_type_identifier),
      "=",
      field("type", $.type_use),
      ";",
    ),

    exception_declaration: $ => seq(
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

    class_declaration: $ => seq(
      optional(field("annotations", $.annotations)),
      "class",
      field("name", $.qualified_type_identifier),
      optional(field("parameters", $.parameters)),
      optional(field("implements", $.implements_clause)),
      field("body", $.class_body),
    ),

    
    trait_declaration: $ => seq(
      optional(field("annotations", $.annotations)),
      "trait",
      field("name", $.qualified_type_identifier),
      "=",
      field("value", $.trait_expression),
    ),

    // Traits
    
    trait_expression: $ => seq(
      field("content", $.basic_trait_expression),
      repeat(field("operation", $.trait_operation)),
    ),

    basic_trait_expression: $ => choice(
      field("methods", $.method_declaration_block),
      field("method", $.method_declaration),
      field("trait", $.type_identifier),
    ),

    trait_operation: $ => choice(
      $.trait_member_removal,
      $.trait_member_modification,
      $.trait_member_addition,
    ),

    trait_member_removal: $ => seq(
      "removes",
      choice(
        field("method", $.method_signature),
        field("methods", $.trait_member_removal_block),
      ),
    ),

    trait_member_removal_block: $ => seq(
      "{",
      repeat(field("method", $.method_signature)),
      "}",
    ),

    method_declaration_block: $ => seq(
      "{",
      repeat(field("method", $.method_declaration)),
      "}",
    ),

    trait_member_modification: $ => seq(
      "modifies",
      field("change", $.basic_trait_expression),
    ),

    trait_member_addition: $ => seq(
      "adds",
      field("addition", $.basic_trait_expression),
    ),

    trait_use: $ => seq(
      "uses",
      field("trait", $.trait_expression),
      ";"
    ),

    implements_clause: $ => seq(
      "implements",
      commaSep1($._interface_name),
    ),

    class_body: $ => seq(
      "{",
      repeat(field("field", $.field_declaration)),
      optional(field("init", $.init_block)),
      optional(field("recover", $.recover_block)),
      repeat(field("trait", $.trait_use)),
      repeat(field("method", $.method_declaration)),
      "}",
    ),

    field_declaration: $ => seq(
      field("type", $.type_use),
      field("name", $.identifier),
      optional(seq(
        "=",
        field("value", $.pure_expression),
      )),
      ";",
    ),

    init_block: $ => seq(
      "{",
      repeat($.statement),
      "}",
    ),

    recover_block: $ => seq(
      "recover",
      "{",
      repeat($.case_statement_branch),
      "}"
    ),

    method_declaration: $ => seq(
      field("return_type", $.type_use),
      field("name", $.identifier),
      field("parameters", $.parameters),
      field("body", $.method_body),
    ),

    method_body: $ => seq(
      "{",
      repeat(field("statement", $.statement)),
      "}",
    ),


    extends_clause: $ => seq(
      "extends",
      commaSep1($._interface_name),
    ),

    interface_body: $ => seq(
      "{",
      repeat($.method_signature),
      "}",
    ),

    method_signature: $ => seq(
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

    parameter: $ => seq(
      optional(field("annotations", $.annotations)),
      field("type", $.type_expression),
      field("name", $.identifier),
    ),

    module_declaration: $ => seq(
      "module",
      field("name", $.qualified_type_identifier),
      ";",
      // TODO: Add exports and imports
      repeat($.declaration),
      optional(field("main", $.main_block)),
    ),

    identifier: _ => /[a-z][A-Za-z0-9_]*/,
    type_identifier: _ => /[A-Z][A-Za-z0-9_]*/,

    qualified_identifier: $ => seq(
      dotSep($.type_identifier),
      $.identifier,
    ),

    qualified_type_identifier: $ => dotSep1($.type_identifier),

    // Name inherited from ANTLR grammar
    // type_use is a type_expression with possible annotations
    type_use: $ => seq(
      optional($.annotations),
      field("name", $.qualified_type_identifier),
      optional(field("parameters", $.type_use_parameters)),
    ),

    type_expression: $ => seq(
      field("name", $.qualified_type_identifier),
      optional(field("parameters", $.type_use_parameters)),
    ),

    type_use_parameters: $ => seq(
      "<",
      commaSep1($.type_use),
      ">",
    ),

    function_name_list: $ => seq(
      "(",
      commaSep($._function_name_decl),
      ")",
    ),

    // Statements
    // Statements are syntactically distinct from declarations
    // declarations (under declaration rule) are top-level declarations
    // while statements are only valid inside methods and the main block

    statement: $ => choice(
      $.expression_statement,
      $.variable_declaration_statement,
      $.assignment_statement,
      $.skip_statement,
      $.return_statement,
      $.assert_statement,
      $.block_statement,
      $.if_statement,
      $.switch_statement,
      $.while_statement,
    ),

    expression_statement: $ => seq(
      optional(field("annotations", $.annotations)),
      $.expression,
      ";",
    ),

    variable_declaration_statement: $ => seq(
      optional(field("annotations", $.annotations)),
      field("type", $.type_expression),
      field("name", $.identifier),
      optional(seq(
        "=",
        field("value", $.expression),
      )),
      ";",
    ),

    assignment_statement: $ => seq(
      optional(field("annotations", $.annotations)),
      field("target", $.variable_or_field_reference),
      "=",
      field("value", $.expression),
      ";",
    ),

    skip_statement: $ => seq(
      optional(field("annotations", $.annotations)),
      "skip",
      ";",
    ),

    return_statement: $ => seq(
      optional(field("annotations", $.annotations)),
      "return", 
      field("value", $.expression),
      ";",
    ),

    assert_statement: $ => seq(
      optional(field("annotations", $.annotations)),
      "assert",
      field("value", $.expression),
      ";",
    ),

    // { statement* } 
    block_statement: $ => seq(
      optional(field("annotations", $.annotations)),
      "{",
      repeat(field("statement", $.statement)),
      "}",
    ),

    if_statement: $ => prec.right(seq(
      optional(field("annotations", $.annotations)),
      "if",
      field("condition", $.parenthesized_expression),
      field("consequence", $.statement),
      optional(field("alternative", $.else_clause)),
    )),

    else_clause: $ => seq("else", $.statement),

    // Should switch statements be a sequence of "{", cases  ,"}"
    switch_statement: $ => seq(
      optional(field("annotations", $.annotations)),
      "switch",
      field("condition", $.parenthesized_expression),
      field("body", $.switch_body),
    ),

    switch_body: $ => seq(
      "{",
      repeat($.case_statement_branch),
      "}"
    ),

    case_statement_branch: $ => seq(
      field("pattern", $.pattern),
      "=>",
      field("body", $.statement),
    ),

    while_statement: $ => seq(
      "while",
      field("condition", $.parenthesized_expression),
      field("body", $.statement),
    ),


    // Patterns

    pattern: $ => choice(
      $.underscore_pattern,
      $.integer_literal,
      $.string_literal,
      $.identifier,
      $.constructor_pattern,
    ),

    underscore_pattern: _ => "_",

    constructor_pattern: $ => seq(
      field("name", $.qualified_type_identifier),
      optional(field("parameters", $.pattern_list)),
    ),

    pattern_list: $ => seq(
      "(",
      commaSep($.pattern),
      ")",
    ),

    // Expressions
    //
    // Expressions in ABS are divided into two categories:
    // - pure expressions
    // - effectful expressions
    //
    // Functions (under top-level function declaration) only allow pure expressions
    // While expressions used in statements can be both pure and effectful
    //
    // We want supertypes for both expression and pure_expression
    // Unfortunately, tree-sitter does not support nested supertypes
    // Thus all pure_expressions are duplicated in `expression` and `pure_expression` rules
    // For now, though I am unsure of what is the best of way of doing this,
    // in respect to the ergonomics of using the tree-sitter parser with queries
    
    expression: $ => choice(
      $.string_literal,
      $.integer_literal,
      $.float_literal,
      $.parenthesized_expression,
      $.this_expression,
    ),

    pure_expression: $ => choice(
      $.string_literal,
      $.integer_literal,
      $.float_literal,
      $.parenthesized_expression,
      $.this_expression,
    ),

    parenthesized_expression: $ => seq(
      "(",
      $.pure_expression,
      ")",
    ),

    this_expression: _ => "this",

    integer_literal: $ => token(DECIMAL_INTEGER),

    float_literal: $ => {
      const EXPONENT = seq(
        choice("e", "E", "e+", "E+", "e-", "E-"),
        /[0-9]+/,
      )

      return token(seq(
        optional(DECIMAL_INTEGER),
        ".",
        /[0-9]+/,
        optional(EXPONENT),
      ))
    },

    // Lex string literals
    // as a sequence of string_content and escape_sequence,
    // where string_content contains everything between each escape_sequence
    // as a single token
    string_literal: $ => seq(
      '"',
      repeat(choice(
        $.string_content,
        $.escape_sequence,
      )),
      token.immediate('"'),
    ),

    escape_sequence: _ => token.immediate(prec(1, seq(
      "\\",
      choice(
        "\\",
        '"',
        "t",
        "n",
        "r",
      ),
    ))),

    string_content: _ => token.immediate(prec(1,/[^\\\"\r\n]+/)),

    builtin_expression: $ => seq(
      "builtin",
      "(",
      commaSep($.pure_expression),
      ")",
    ),

    // Overrides
    _function_name_decl: $ => $.identifier,
    _interface_name: $ => $.qualified_type_identifier,

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

    variable_or_field_reference: $ => seq(
      optional(seq(
        $.this_expression,
        ".", 
      )),
      $.identifier,
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
