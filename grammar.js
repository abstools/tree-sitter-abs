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

const PRODUCT_PREC = {
  STANDARD: 0,
  PAREN: 1,
  OR: 2,
  AND: 3,
  NOT: 4,
}

const SET_PREC = {
  DIFFERENCE: 1,
  UNION: 2,
  INTERSECTION: 3,
}

const MODEL_PREC = {
  LOGICAL_OR: 1,
  LOGICAL_AND: 2,
  IMPLICATION: 3,
  EQUAL: 4,
  RELATIONAL: 5,
  ADD: 6,
  MULTIPLY: 7,
  UNARY: 8,
}

module.exports = grammar({
  name: "abs",

  extras: ($) => [
    /[\s\f]/, // Whitespace
    $.comment
  ],

  supertypes: ($) => [
    // Core ABS
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
    $.type,

    // Delta modules
    $.delta_parameter,
    $.has_condition,
    $.module_modifier,
    $.functional_modifier,
    $.object_oriented_modifier,
    $.namespace_modifier,
    $.class_modifier_fragment,
    $.interface_modifier_fragment,
    $.application_condition,

    // Products
    $.product_expression,

    // Feature model
    $.model_expression,
    $.constraint,
  ],

  conflicts: $ => [
    [$.qualified_type_identifier, $.type_name],
    [$.qualified_identifier, $.qualified_type_identifier, $.type_name],
    [$.qualified_identifier, $.qualified_type_identifier, $.type_name, $.original_call_expression],
    [$.pure_expression, $.field_access],
    [$.await, $.await_statement],
    [$.qualified_type_identifier],
    [$.if_statement, $.pure_expression],
    [$.expression, $.case_branch],
    [$._unannotated_type, $.constructor_expression],
    [$.generic_type, $.constructor_expression],
    [$._function_parameter, $._variable_or_field_reference],
  ],

  inline: $ => [
    $._function_name_decl,
    $._interface_name,
    $._delta_identifier,
  ],

  reserved: {
    global: _ => [
      "adds", "after", "allof", "as", "assert", "await", "builtin", "case",
      "catch", "class", "core", "data", "def", "delta", "destiny", "die",
      "duration", "else", "exception", "exclude", "export", "extends",
      "extension", "features", "finally", "foreach", "from", "get", "group",
      "hasField", "hasInterface", "hasMethod", "if", "ifin", "ifout",
      "implements", "import", "in", "interface", "let", "local", "modifies",
      "module", "movecogto", "new", "null", "oneof", "opt", "original",
      "product", "productline", "recover", "removes", "require", "return",
      "root", "skip", "suspend", "switch", "then", "this", "throw", "to",
      "trait", "try", "type", "uses", "when", "while",
    ]
  },

  word: $ => $.identifier,

  rules: {
    source_file: $ => seq(
      repeat($.module_declaration),
      repeat($.delta_declaration),
      optional($.productline_declaration),
      repeat($.product_declaration),
      repeat(choice(
        $.root_feature,
        $.feature_extension,
      )),
    ),

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
      optional(field("parameters", $.type_parameter_list)),
      optional(field("constructors", $.data_constructor_clause)),
      ";",
    ),

    type_parameter_list: $ => seq(
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
      optional(field("parameters", $.data_constructor_parameter_list)),
    ),

    data_constructor_parameter_list: $ => seq(
      "(",
      commaSep1($.data_constructor_parameter),
      ")",
    ),

    data_constructor_parameter: $ => seq(
      field("type", $.type),
      optional(field("name", $.identifier)),
    ),

    function_declaration: $ => seq(
      optional(field("annotations", $.annotations)),
      "def",
      field("return_type", $.type),
      field("name", $.name),
      optional(field("type_parameters", $.type_parameter_list)),
      field("parameters", $.parameter_list),
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
      field("return_type", $.type),
      field("name", $.name),
      optional(field("type_parameters", $.type_parameter_list)),
      field("functions", $.function_name_list),
      field("parameters", $.parameter_list),
      "=",
      field("expression", $.pure_expression),
      ";",
    ),

    type_synonym_declaration: $ => seq(
      optional(field("annotations", $.annotations)),
      "type",
      field("name", $.type_name),
      "=",
      field("type", $.type),
      ";",
    ),

    exception_declaration: $ => seq(
      optional(field("annotations", $.annotations)),
      "exception",
      field("name", $.type_name),
      optional(field("parameters", $.data_constructor_parameter_list)),
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
      optional(field("parameters", $.parameter_list)),
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
      field("type", $.type),
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
      field("return_type", $.type),
      field("name", $.identifier),
      field("parameters", $.parameter_list),
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
      field("return_type", $.type),
      field("name", $.identifier),
      field("parameters", $.parameter_list),
      ";"
    ),

    parameter_list: $ => seq(
      "(",
      commaSep($.parameter),
      ")",
    ),

    parameter: $ => seq(
      optional(field("annotations", $.annotations)),
      field("type", $._unannotated_type),
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

    // Types
    //
    // Types in ABS have (syntactically) two forms
    // Type identifiers and generic types
    // In addition, types can sometimes be annotated
    //
    // In the ANTLR grammar, type_use allows annotations,
    // while type_exp does not
    //
    // As we want an intuitive tree structure, 
    // we want to reorganize this
  
    // Represents type_use in ANTLR grammar
    // Typically used to declare the static types of variables, methods and fields
    type: $ => choice(
      $.annotated_type,
      $._unannotated_type,
    ),

    // Type with annotation
    annotated_type: $ => seq(
      field("annotations", $.annotations),
      $._unannotated_type,
    ),

    // Represents type_exp in ANTLR grammar
    // Types without annotations on the base type
    // (Generic) Type arguments can have annotations
    _unannotated_type: $ => choice(
      $.type_name,
      $.generic_type,
    ),

    generic_type: $ => seq(
      field("name", $.type_name), 
      field("arguments", $.type_argument_list),
    ),

    type_argument_list: $ => seq(
      "<",
      commaSep1($.type),
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
      field("type", $._unannotated_type),
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
      $.wildcard_pattern,
      $.integer_literal,
      $.string_literal,
      $.identifier,
      $.constructor_pattern,
    ),

    wildcard_pattern: _ => "_",

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
      optional(seq(
        field("target", choice(
          $.core,
          $._delta_identifier,
        )),
        ".",
      )),
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
      $.partial_function_call_expression,
      $.variadic_function_call_expression,
      $.constructor_expression,
      $.unary_expression,
      $.binary_expression,
      $.as_expression,
      $.when_expression,
      $.old_if_expression,
      $.implements_expression,
      $.case_expression,
      $.let_expression,
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
      commaSep1($._function_parameter),
      ")",
    ),

    _function_parameter: $ => choice(
      $.identifier,
      $.anonymous_function_declaration,
    ),

    anonymous_function_declaration: $ => seq(
      field("parameters", $.parameter_list),
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

    // The ABS compiler has both parenthesis optional
    // which means that uneven parenthesis such as "let (Int x"
    // is accepted by the ABS compiler
    let_expression: $ => seq(
      "let",
      commaSep1($.let_binding),
      "in",
      field("body", $.pure_expression),
    ),

    let_binding: $ => seq(
      choice(
        $.parenthesized_variable_declaration,
        $.variable_declaration,
      ),
      "=",
      field("value", $.pure_expression),
    ),

    parenthesized_variable_declaration: $ => seq(
      "(",
      field("type", $.type), 
      field("name", $.identifier),
      ")",
    ),

    variable_declaration: $ => seq(
      field("type", $.type), 
      field("name", $.identifier),
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
      optional(field("arguments", $.argument_list)),
    ),

    // Delta modules
    // https://abs-models.org/manual/feature-modeling.html

    delta_declaration: $ => seq(
      "delta",
      field("name", $.type_identifier),
      optional(field("parameters", $.delta_parameter_list)),
      ";",
      optional(field("uses", $.delta_uses_module)),
      repeat(field("modifier", $.module_modifier)),
    ),

    delta_parameter_list: $ => seq(
      "(",
      commaSep1($.delta_parameter),
      ")",
    ),

    delta_parameter: $ => choice(
      alias($.parameter, $.delta_field_parameter),
      $.delta_class_parameter,
    ),

    delta_class_parameter: $ => seq(
      field("name", $.type_name),
      field("condition", $.has_condition),
    ),

    has_condition: $ => choice(
      $.has_field_condition,
      $.has_method_condition,
      $.has_interface_condition,
    ),

    has_field_condition: $ => seq(
      "hasField",
      field("field", $.field_declaration),
    ),

    has_method_condition: $ => seq(
      "hasMethod",
      field("method", $.method_signature),
    ),

    has_interface_condition: $ => seq(
      "hasInterface",
      field("interface", $._interface_name),
    ),

    delta_uses_module: $ => seq(
      "uses",
      field("module", $.module_name),
      ";",
    ),

    module_modifier: $ => choice(
      $.functional_modifier,
      $.object_oriented_modifier,
      $.namespace_modifier,
    ),

    functional_modifier: $ => choice(
      $.add_function_modifier,
      $.add_datatype_modifier,
      $.add_type_synonym_modifier,
      $.modify_type_synonym_modifier,
      $.modify_datatype_modifier,
    ),

    add_function_modifier: $ => seq(
      "adds",
      field("declaration", $.function_declaration),
    ),

    add_datatype_modifier: $ => seq(
      "adds",
      field("declaration", $.datatype_declaration),
    ),

    add_type_synonym_modifier: $ => seq(
      "adds",
      field("declaration", $.type_synonym_declaration),
    ),

    modify_type_synonym_modifier: $ => seq(
      "modifies",
      field("declaration", $.type_synonym_declaration),
    ),

    modify_datatype_modifier: $ => seq(
      "modifies",
      field("declaration", $.datatype_declaration),
    ),

    object_oriented_modifier: $ => choice(
      $.add_class_modifier,
      $.remove_class_modifier,
      $.modify_class_modifier,
      $.add_interface_modifier,
      $.remove_interface_modifier,
      $.modify_interface_modifier,
    ),

    add_class_modifier: $ => seq(
      "adds",
      field("declaration", $.class_declaration),
    ),

    remove_class_modifier: $ => seq(
      "removes",
      "class",
      field("name", $.type_name),
      ";",
    ),

    modify_class_modifier: $ => seq(
      "modifies",
      "class",
      field("name", $.type_name),
      optional(field("added_interfaces", $.added_interface_list)),
      optional(field("removed_interfaces", $.removed_interface_list)),
      field("body", $.class_modifier_block),
    ),

    added_interface_list: $ => seq(
      "adds",
      commaSep1($._interface_name),
    ),

    removed_interface_list: $ => seq(
      "removes",
      commaSep1($._interface_name),
    ),

    class_modifier_block: $ => seq(
      "{",
      repeat(field("fragment", $.class_modifier_fragment)),
      "}",
    ),

    class_modifier_fragment: $ => choice(
      $.add_field_fragment,
      $.remove_field_fragment,
      $.trait_operation,
    ),

    add_field_fragment: $ => seq(
      "adds",
      field("field", $.field_declaration),
    ),

    remove_field_fragment: $ => seq(
      "removes",
      field("field", $.field_declaration),
    ),

    add_interface_modifier: $ => seq(
      "adds",
      field("declaration", $.interface_declaration),
    ),

    remove_interface_modifier: $ => seq(
      "removes",
      "interface",
      field("name", $._interface_name),
      ";",
    ),

    modify_interface_modifier: $ => seq(
      "modifies",
      "interface",
      field("name", $._interface_name),
      field("body", $.interface_modifier_block),
    ),

    interface_modifier_block: $ => seq(
      "{",
      repeat(field("fragment", $.interface_modifier_fragment)),
      "}",
    ),

    interface_modifier_fragment: $ => choice(
      $.add_method_signature_fragment,
      $.remove_method_signature_fragment,
    ),

    add_method_signature_fragment: $ => seq(
      "adds",
      field("method", $.method_signature),
    ),

    remove_method_signature_fragment: $ => seq(
      "removes",
      field("method", $.method_signature),
    ),

    namespace_modifier: $ => choice(
      $.add_import_modifier,
      $.add_export_modifier,
    ),

    add_import_modifier: $ => seq(
      "adds",
      field("declaration", $.import_declaration),
    ),

    add_export_modifier: $ => seq(
      "adds",
      field("declaration", $.export_declaration),
    ),

    // Product lines

    productline_declaration: $ => seq(
      "productline",
      field("name", $.type_identifier),
      ";",
      "features",
      commaSep1($.feature),
      ";",
      repeat($.delta_clause),
    ),

    feature: $ => seq(
      field("name", $._feature_name),
      optional($.attribute_assignment_block),
    ),

    _feature_name: $ => choice(
      $.feature_prime,
      $.type_identifier,
    ),

    feature_prime: $ => seq(
      $.type_identifier,
      token.immediate("'"),
    ),

    attribute_assignment_block: $ => seq(
      "{",
      commaSep1($.attribute_assignment),
      "}",
    ),

    attribute_assignment: $ => seq(
      field("name", $.identifier),
      "=",
      field("value", choice(
        $.integer_literal,
        $.type_identifier,
        $.string_literal,
      )),
    ),

    delta_clause: $ => seq(
      "delta",
      $.delta_specification,
      optional($.after_condition),
      optional($.from_condition),
      optional($.when_condition),
      ";",
    ),

    delta_specification: $ => seq(
      $.type_identifier,
      optional(field("parameters", $.delta_specification_parameter_list)),
    ),

    delta_specification_parameter_list: $ => seq(
      "(",
      commaSep1($.delta_specification_parameter),
      ")",
    ),

    delta_specification_parameter: $ => choice(
      $.type_identifier,
      $.integer_literal,
      $.feature_attribute_reference,
    ),

    feature_attribute_reference: $ => seq(
      field("feature", $.type_identifier),
      ".",
      field("attribute", $.identifier),
    ),

    after_condition: $ => seq(
      "after",
      commaSep1($._delta_identifier),
    ),

    from_condition: $ => seq(
      "from",
      $.application_condition,
    ),

    when_condition: $ => seq(
      choice(
        "when",
        "to",
      ),
      $.application_condition,
    ),

    application_condition: $ => choice(
      $.not_application_condition,
      $.and_application_condition,
      $.or_application_condition,
      $.parenthesized_application_condition,
      $.feature,
    ),

    not_application_condition: $ => prec(PRODUCT_PREC.NOT, seq(
      "!",
      $.application_condition,
    )),

    and_application_condition: $ => prec.left(PRODUCT_PREC.AND, seq(
      field("left", $.application_condition),
      "&&",
      field("right", $.application_condition),
    )),

    or_application_condition: $ => prec.left(PRODUCT_PREC.OR, seq(
      field("left", $.application_condition),
      "||",
      field("right", $.application_condition),
    )),

    parenthesized_application_condition: $ => prec(PRODUCT_PREC.PAREN, seq(
      "(",
      $.application_condition,
      ")",
    )),

    // Products

    product_declaration: $ => seq(
      "product",
      field("name", $.type_identifier),
      choice(
        $.feature_list,
        $.product_expression_clause,
      ),
      ";",
    ),

    feature_list: $ => seq(
      "(",
      commaSep($.feature),
      ")",
    ),

    product_expression_clause: $ => seq(
      "=",
      $.product_expression,
    ),

    product_expression: $ => choice(
      $.type_identifier,  
      $.product_difference,
      $.product_intersection,
      $.product_union,
      $.feature_set,
      $.product_parenthesized_expression,
    ),

    product_difference: $ => prec.left(SET_PREC.DIFFERENCE, seq(
      field("left", $.product_expression),
      "-",
      field("right", $.product_expression),
    )),

    product_union: $ => prec.left(SET_PREC.UNION, seq(
      field("left", $.product_expression),
      "||",
      field("right", $.product_expression),
    )),

    product_intersection: $ => prec.left(SET_PREC.INTERSECTION, seq(
      field("left", $.product_expression),
      "&&",
      field("right", $.product_expression),
    )),

    feature_set: $ => seq(
      "{",
      commaSep1($.feature),
      "}",
    ),

    product_parenthesized_expression: $ => seq(
      "(",
      $.product_expression,
      ")",
    ),

    root_feature: $ => seq(
      "root",
      $.feature_declaration,
    ),

    feature_extension: $ => seq(
      "extension",
      field("feature", $.type_identifier),
      field("body", $.feature_body),
    ),

    feature_declaration: $ => seq(
      field("name", $.type_identifier),
      optional(field("body", $.feature_body)),
    ),

    feature_body: $ => seq(
      "{",
      optional($.feature_group),
      repeat(choice(
        $.feature_attribute,
        $.constraint,
      )),
      "}",
    ),

    feature_group: $ => seq(
      "group",
      field("cardinality", $._group_cardinality),
      field("members", $.group_member_list),
    ),

    _group_cardinality: $ => choice(
      alias("oneof", $.one_of),
      alias("allof", $.all_of),
      $.cardinality_range,
    ),

    cardinality_range: $ => seq(
      "[",
      field("min", $.integer_literal),
      "..",
      field("max", choice(
        $.integer_literal,
        $.unbounded,
      )),
      "]",
    ),

    group_member_list: $ => seq(
      "{",
      commaSep1($.group_member),
      "}",
    ),

    group_member: $ => seq(
      optional(field("modifier", alias("opt", $.optional))),
      $.feature_declaration,
    ),

    feature_attribute: $ => seq(
      field("type", $.type_identifier), 
      choice(
        seq(
          field("domain", $.range),
          field("name", $.identifier),
        ),
        seq(
          field("name", $.identifier),
          optional(seq(
            "in",
            field("domain", choice(
              $.range,
              $.value_set,
            ))
          ))
        ),
      ),
      ";",
    ),

    constraint: $ => choice(
      $.feature_constraint,
      $.expression_constraint,
    ),

    feature_constraint: $ => seq(
      field("kind", choice(
        alias("exclude", $.exclude),
        alias("require", $.require)
      )),
      ":",
      field("target", $.type_identifier),
      ";",
    ),

    expression_constraint: $ => seq(
      optional(seq(
        field("kind", choice(
          alias("ifin", $.if_in),
          alias("ifout", $.if_out),
        )),
        ":",
      )),
      field("condition", $.model_expression),
      ";",
    ),

    range: $ => seq(
      "[",
      field("start", $._boundary_integer),
      "..",
      field("end", $._boundary_integer),
      "]",
    ),

    value_set: $ => seq(
      "{",
      commaSep1(alias($._signed_integer_literal, $.integer_literal)),
      "}",
    ),

    _boundary_integer: $ => choice(
      $.unbounded, 
      alias($._signed_integer_literal, $.integer_literal),
    ),

    _signed_integer_literal: _ => token(seq(
      optional("-"),   
      DECIMAL_INTEGER,
    )),

    model_expression: $ => choice(
      $.feature_attribute_reference,
      $.type_identifier,
      $.identifier,
      $.integer_literal,
      $.model_unary_expression,
      $.model_binary_expression,
      $.model_parenthesized_expression,
    ),

    model_unary_expression: $ => prec(MODEL_PREC.UNARY, seq(
      field("operator", choice("!", "-")),
      field("argument", $.model_expression),
    )),

    model_binary_expression: $ => {
      const table = [
        ["*", MODEL_PREC.MULTIPLY],
        ["/", MODEL_PREC.MULTIPLY],
        ["%", MODEL_PREC.MULTIPLY],
        ["+", MODEL_PREC.ADD],
        ["-", MODEL_PREC.ADD],
        ["<", MODEL_PREC.RELATIONAL],
        ["<=", MODEL_PREC.RELATIONAL],
        [">", MODEL_PREC.RELATIONAL],
        [">=", MODEL_PREC.RELATIONAL],
        ["==", MODEL_PREC.EQUAL],
        ["!=", MODEL_PREC.EQUAL],
        ["->", MODEL_PREC.IMPLICATION, "right"],
        ["<->", MODEL_PREC.IMPLICATION],
        ["&&", MODEL_PREC.LOGICAL_AND],
        ["||", MODEL_PREC.LOGICAL_OR],
      ];

      return choice(...table.map(([operator, precedence, assoc]) => 
        (assoc == "right" ? prec.right : prec.left)(precedence, seq(
          field("left", $.model_expression),
          // @ts-ignore
          field("operator", operator),
          field("right", $.model_expression),
        ))
      ));
    },

    model_parenthesized_expression: $ => seq(
      "(",
      $.model_expression,
      ")",
    ),

    // Overrides
    _function_name_decl: $ => $.identifier,
    _interface_name: $ => $.type_name,
    _delta_identifier: $ => alias($.type_identifier, $.delta_identifier),

    annotations: $ => repeat1(seq(
      "[",
      commaSep1($.annotation),
      "]",
    )),

    annotation: $ => choice(
      field("value", $.pure_expression),
      seq(
        field("tag", $.type_identifier),
        ":",
        field("value", $.pure_expression),
      ),
    ),


    // Certain keywords

    local: _ => "local",
    await: _ => "await",
    wildcard: _ => "*",
    unbounded: _ => "*",
    core: _ => "core",


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
