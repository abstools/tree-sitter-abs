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

const PREC = {
  STANDARD: 0,
  CAST: 1,
  IMPLEMENTS: 2,
  LOGICAL_OR: 3,
  LOGICAL_AND: 4,
  EQUAL: 5,
  RELATIONAL: 6,
  ADD: 7,
  MULTIPLY: 8,
  UNARY: 9,
  CALL: 10,
};

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
    $.effectful_expression,
    $.trait_operation,
    $.pattern,
    $.guard,
    $.name,
    $.type_name,
    $.any_name,
  ],

  conflicts: $ => [
    [$.qualified_type_identifier, $.type_name],
    [$.qualified_identifier, $.qualified_type_identifier, $.type_name],
    [$.pure_expression, $.field_access],
    [$.await, $.await_statement],
    [$.qualified_type_identifier],
    [$.if_statement, $.pure_expression],
    [$.expression, $.case_branch],
    [$.type_expression, $.constructor_expression],
  ],

  word: $ => $.identifier,

  rules: {
    source_file: $ => repeat($.module_declaration),

    main_block: $ => seq(
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
      field("name", $.type_name),
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
      field("name", $.name),
      optional(field("type_parameters", $.type_parameters)),
      field("parameters", $.parameters),
      "=",
      field("expression", choice(
        $.builtin_expression,
        $.pure_expression,
      )),
      ";"
    ),

    partial_function_declaration: $ => seq(
      optional(field("annotations", $.annotations)),
      "def",
      field("return_type", $.type_use),
      field("name", $.name),
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
      field("name", $.type_name),
      "=",
      field("type", $.type_use),
      ";",
    ),

    exception_declaration: $ => seq(
      optional(field("annotations", $.annotations)),
      "exception",
      field("name", $.type_name),
      optional(field("parameters", $.data_constructor_parameters)),
      ";",
    ),

    interface_declaration: $ => seq(
      optional(field("annotations", $.annotations)),
      "interface",
      field("name", $.type_name),
      optional(field("extends", $.extends_clause)),
      field("body", $.interface_body),
    ),

    class_declaration: $ => seq(
      optional(field("annotations", $.annotations)),
      "class",
      field("name", $.type_name),
      optional(field("parameters", $.parameters)),
      optional(field("implements", $.implements_clause)),
      field("body", $.class_body),
    ),


    trait_declaration: $ => seq(
      optional(field("annotations", $.annotations)),
      "trait",
      field("name", $.type_name),
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

    trait_member_addition: $ => seq(
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
      field("body", $.branch_block),
    ),

    method_declaration: $ => seq(
      field("return_type", $.type_use),
      field("name", $.identifier),
      field("parameters", $.parameters),
      field("body", $.method_body),
    ),

    method_body: $ => seq(
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
      field("name", $.type_name),
      ";",
      repeat($._module_directive),
      repeat($.declaration),
      optional(field("main", $.main_block)),
    ),

    _module_directive: $ => choice(
      $.import_declaration,
      $.export_declaration,
    ),

    import_declaration: $ => seq(
      "import",
      choice(
        $.wildcard_import,
        $.from_import,
        $.qualified_import,
      ),
      ";",
    ),

    wildcard_import: $ => seq(
      $.wildcard,
      "from",
      field("module", $.module_name),
    ),

    from_import: $ => seq(
      commaSep1(field("symbol", $.any_name)),
      "from",
      field("module", $.module_name),
    ),

    qualified_import: $ => seq(
      commaSep1(field("symbol", $.any_name)),
    ),

    export_declaration: $ => seq(
      "export",
      choice(
        $.wildcard,
        commaSep1(field("symbol", $.any_name)),
      ),
      optional(seq(
        "from",
        field("module", $.module_name),
      )),
      ";",
    ),

    module_name: $ => seq(
      repeat(seq(alias($.type_identifier, $.module_identifier), ".")),
      alias($.type_identifier, $.module_identifier),
    ),

    identifier: _ => /[a-z][A-Za-z0-9_]*/,
    type_identifier: _ => /[A-Z][A-Za-z0-9_]*/,

    // Both qualified_identifier and qualified_type_identifier share a common prefix (dot separated type_identifier).
    // If each rule parses the prefix itself, the parser must choose between them before reaching the last part,
    // which leads to a conflict.
    // We share the prefix in one rule, so the choice is delayed until the last part (identifier or type_identifier).
    _qualifier: $ => repeat1(seq($.type_identifier, ".")),

    qualified_identifier: $ => seq(
      $._qualifier,
      $.identifier,
    ),

    qualified_type_identifier: $ => seq(
      $._qualifier,
      $.type_identifier,
    ),

    // The ANTLR parser used by the ABS compiler
    // parses qualified versions of identifiers and type identifiers even if the name is not qualified.
    // We only want qualified versions when the name is qualified.
    // We therefore use type_name and name in place of qualified_type_identifier and qualified_identifier
    // from the ANTLR grammar.
    // These are supertypes, so they do not show up in the syntax tree.

    type_name: $ => choice(
      $.type_identifier,
      $.qualified_type_identifier,
    ),

    name: $ => choice(
      $.identifier,
      $.qualified_identifier,
    ),

    any_name: $ => choice(
      $.name,
      $.type_name,
    ),

    // Name inherited from ANTLR grammar
    // type_use is a type_expression with possible annotations
    type_use: $ => seq(
      optional($.annotations),
      field("name", $.type_name),
      optional(field("parameters", $.type_use_parameters)),
    ),

    type_expression: $ => seq(
      field("name", $.type_name),
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
      $.foreach_statement,
      $.try_statement,
      $.await_statement,
      $.suspend_statement,
      $.duration_statement,
      $.throw_statement,
      $.die_statement,
      $.movecogto_statement,
      $.old_case_statement,
    ),

    expression_statement: $ => seq(
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

    assignment_statement: $ => seq(
      optional(field("annotations", $.annotations)),
      field("target", $._variable_or_field_reference),
      "=",
      field("value", $.expression),
      ";",
    ),

    skip_statement: $ => seq(
      optional(field("annotations", $.annotations)),
      "skip",
      ";",
    ),

    return_statement: $ => seq(
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
    block_statement: $ => seq(
      optional(field("annotations", $.annotations)),
      "{",
      repeat(field("statement", $.statement)),
      "}",
    ),

    if_statement: $ => prec.right(seq(
      optional(field("annotations", $.annotations)),
      "if",
      field("condition", $.parenthesized_expression),
      field("consequence", $.statement),
      optional(field("alternative", $.else_clause)),
    )),

    else_clause: $ => seq("else", $.statement),

    // Should switch statements be a sequence of "{", cases  ,"}"
    switch_statement: $ => seq(
      optional(field("annotations", $.annotations)),
      "switch",
      field("condition", $.parenthesized_expression),
      field("body", $.branch_block),
    ),

    branch_block: $ => seq(
      "{",
      repeat($.statement_branch),
      "}"
    ),

    statement_branch: $ => seq(
      field("pattern", $.pattern),
      "=>",
      field("body", $.statement),
    ),

    while_statement: $ => seq(
      optional(field("annotations", $.annotations)),
      "while",
      field("condition", $.parenthesized_expression),
      field("body", $.statement),
    ),

    foreach_statement: $ => seq(
      optional(field("annotations", $.annotations)),
      "foreach",
      "(",
      field("variable", $.identifier),
      optional(seq(
        ",",
        field("index", $.identifier),
      )),
      "in",
      field("expression", $.pure_expression),
      ")",
      field("body", $.statement),
    ),

    try_statement: $ => prec.right(seq(
      optional(field("annotations", $.annotations)),
      "try",
      field("body", $.statement),
      field("handler", $.catch_clause),
      optional(field("finalizer", $.finally_clause)),
    )),

    catch_clause: $ => seq(
      "catch",
      choice(
        $.statement_branch,
        $.branch_block,
      ),
    ),

    finally_clause: $ => seq(
      "finally",
      $.statement,
    ),

    await_statement: $ => seq(
      optional(field("annotations", $.annotations)),
      "await",
      field("guard", $.guard),
      ";",
    ),

    suspend_statement: $ => seq(
      optional(field("annotations", $.annotations)),
      "suspend",
      ";",
    ),

    duration_statement: $ => seq(
      optional(field("annotations", $.annotations)),
      "duration",
      "(",
      field("minimum", $.pure_expression),
      optional(seq(
        ",",
        field("maximum", $.pure_expression),
      )),
      ")",
      ";",
    ),

    throw_statement: $ => seq(
      optional(field("annotations", $.annotations)),
      "throw",
      field("value", $.pure_expression),
      ";",
    ),

    die_statement: $ => seq(
      optional(field("annotations", $.annotations)),
      "die",
      field("value", $.pure_expression),
      ";",
    ),

    movecogto_statement: $ => seq(
      optional(field("annotations", $.annotations)),
      "movecogto",
      field("value", $.pure_expression),
      ";",
    ),

    // Case statements (with "case" keyword) are identical to switch statements
    // Switch statements are preferred (idiomatically)
    // thus case statements are referred to as "old-style"
    //
    // All case statements are valid case expressions (if the final semicolon is removed)
    // As empty statements are not allowed, this is not ambiguous
    old_case_statement: $ => seq(
      optional(field("annotations", $.annotations)),
      "case",
      field("condition", $.pure_expression),
      field("body", $.branch_block),
    ),

    // Patterns

    pattern: $ => choice(
      $.underscore_pattern,
      $.integer_literal,
      $.string_literal,
      $.identifier,
      $.constructor_pattern,
    ),

    underscore_pattern: _ => "_",

    constructor_pattern: $ => seq(
      field("name", $.type_name),
      optional(field("parameters", $.pattern_list)),
    ),

    pattern_list: $ => seq(
      "(",
      commaSep($.pattern),
      ")",
    ),

    // Guards

    guard: $ => choice(
      $.claim_guard,
      $.duration_guard,
      $.expression_guard,
      $.and_guard,
    ),

    claim_guard: $ => seq(
      $._variable_or_field_reference,
      "?",
    ),

    duration_guard: $ => seq(
      "duration",
      "(",
      field("minimum", $.pure_expression),
      optional(seq(
        ",",
        field("maximum", $.pure_expression),
      )),
      ")",
    ),

    expression_guard: $ => seq(
      $.pure_expression,
    ),

    and_guard: $ => prec.left(seq(
      field("left", $.guard),
      "&",
      field("right", $.guard),
    )),

    // Expressions
    //
    // Expressions in ABS are divided into two categories:
    // - pure expressions
    // - effectful expressions
    //
    // Functions (under top-level function declaration, as opposed to class methods) only allow pure expressions
    // Expressions used in statements can be both pure and effectful

    expression: $ => choice(
      $.effectful_expression,
      $.pure_expression,
    ),

    effectful_expression: $ => choice(
      $.get_expression,
      $.new_expression,
      $.async_call_expression,
      $.sync_call_expression,
      $.original_call_expression,
    ),

    get_expression: $ => seq(
      field("future", $.pure_expression),
      ".",
      "get",
    ),

    new_expression: $ => seq(
      "new",
      optional(field("local", $.local)),
      field("constructor", $.type_name),
      field("arguments", $.argument_list),
    ),

    async_call_expression: $ => seq(
      optional(field("await", $.await)),
      field("object", $.pure_expression),
      "!",
      field("method", $.identifier),
      field("arguments", $.argument_list),
    ),

    sync_call_expression: $ => seq(
      field("object", $.pure_expression),
      ".",
      field("method", $.identifier),
      field("arguments", $.argument_list),
    ),

    original_call_expression: $ => seq(
      // TODO: Add delta-id or core. reference ABS antlr grammar
      "original",
      field("arguments", $.argument_list),
    ),


    pure_expression: $ => choice(
      $.string_literal,
      $.template_string_literal,
      $.integer_literal,
      $.float_literal,
      $.parenthesized_expression,
      $.this_expression,
      $.destiny_expression,
      $.null_expression,
      $._variable_or_field_reference,
      $.function_call_expression,
      $.variadic_function_call_expression,
      $.constructor_expression,
      $.unary_expression,
      $.binary_expression,
      $.as_expression,
      $.when_expression,
      $.old_if_expression,
      $.implements_expression,
      $.case_expression,
    ),

    parenthesized_expression: $ => seq(
      "(",
      $.pure_expression,
      ")",
    ),

    this_expression: _ => "this",
    destiny_expression: _ => "destiny",
    null_expression: _ => "null",

    function_call_expression: $ => prec(PREC.CALL, seq(
      field("name", $.name),
      field("arguments", $.argument_list),
    )),

    argument_list: $ => seq(
      "(",
      commaSep($.pure_expression),
      ")",
    ),

    variadic_argument_list: $ => seq(
      "[",
      commaSep($.pure_expression),
      "]",
    ),

    function_list: $ => seq(
      "(",
      commaSep1($.function_parameter),
      ")",
    ),

    function_parameter: $ => choice(
      $.identifier,
      $.anonymous_function_declaration,
    ),

    anonymous_function_declaration: $ => seq(
      field("parameters", $.parameters),
      "=>",
      field("body", $.pure_expression),
    ),

    partial_function_call_expression: $ => seq(
      field("name", $.name),
      field("functions", $.function_list),
      field("arguments", $.argument_list),
    ),

    variadic_function_call_expression: $ => seq(
      field("function", $.name),
      field("arguments", $.variadic_argument_list),
    ),

    constructor_expression: $ => seq(
      field("name", $.type_name),
      optional(field("arguments", $.argument_list)),
    ),

    unary_expression: $ => prec(PREC.UNARY, seq(
      field("operator", choice("-", "!")),
      field("argument", $.pure_expression),
    )),

    binary_expression: $ => {
      const table = [
        ["||", PREC.LOGICAL_OR],
        ["&&", PREC.LOGICAL_AND],
        ["==", PREC.EQUAL],
        ["!=", PREC.EQUAL],
        ["<", PREC.RELATIONAL],
        ["<=", PREC.RELATIONAL],
        [">", PREC.RELATIONAL],
        [">=", PREC.RELATIONAL],
        ["+", PREC.ADD],
        ["-", PREC.ADD],
        ["*", PREC.MULTIPLY],
        ["/", PREC.MULTIPLY],
        ["%", PREC.MULTIPLY],
      ];

      return choice(...table.map(([operator, precedence]) => {
        return prec.left(precedence, seq(
          field("left", $.pure_expression),
          // @ts-ignore
          field("operator", operator),
          field("right", $.pure_expression),
        ))
      }))
    },

    as_expression: $ => prec(PREC.CAST, seq(
      field("expression", $.pure_expression),
      "as",
      field("interface", $._interface_name),
    )),

    when_expression: $ => seq(
      "when",
      field("condition", $.pure_expression),
      "then",
      field("consequence", $.pure_expression),
      "else",
      field("alternative", $.pure_expression),
    ),

    implements_expression: $ => prec(PREC.IMPLEMENTS, seq(
      field("expression", $.pure_expression),
      "implements",
      field("interface", $._interface_name),
    )),

    case_expression: $ => seq(
      "case",
      field("condition", $.pure_expression),
      field("body", $.case_block),
    ),

    case_block: $ => seq(
      "{",
      repeat1($.case_branch),
      "}",
    ),

    case_branch: $ => seq(
      optional("|"),
      field("pattern", $.pattern),
      "=>",
      field("body", $.pure_expression),
      optional(";"),
    ),

    old_if_expression: $ => seq(
      "if",
      field("condition", $.pure_expression),
      "then",
      field("consequence", $.pure_expression),
      "else",
      field("alternative", $.pure_expression),
    ),

    _variable_or_field_reference: $ => choice(
      $.field_access,
      $.identifier,
    ),

    field_access: $ => seq(
      $.this_expression,
      ".",
      field("field", $.identifier),
    ),

    integer_literal: _ => token(DECIMAL_INTEGER),

    float_literal: _ => {
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

    string_content: _ => token.immediate(prec(1, /[^\\\"\r\n]+/)),

    // Template strings
    // Template strings support string interpolation between '$' i.e. `$name$`
    // Only '`' and '$' can be escaped with a backslash
    // Unlike in normal string literals, backslash (the character literal) is not escaped
    // `\ ` will therefore evaluate to a string containing a backslash and a space
    
    template_string_literal: $ => seq(
      "`",
      repeat(choice(
        $.template_string_escape_sequence,
        $.template_string_content,
        $.template_string_substitution,
      )),
      token.immediate("`"),
    ),

    template_string_escape_sequence: _ => token.immediate(prec(1, seq(
      "\\",
      choice(
        "`",
        "$",
      ),
    ))),

    // Only '`' and '$' can be escaped inside template strings
    // '\' followed by anything else is there part of string content
    template_string_content: _ => token.immediate(prec(1, /([^`$\\]|\\[^`$])+/)),

    template_string_substitution: $ => seq(
      "$",
      $.pure_expression,
      "$",
    ),

    builtin_expression: $ => seq(
      "builtin",
      "(",
      commaSep($.pure_expression),
      ")",
    ),

    // Overrides
    _function_name_decl: $ => $.identifier,
    _interface_name: $ => $.type_name,

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


    // Certain keywords

    local: _ => "local",
    await: _ => "await",
    wildcard: _ => "*",


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
