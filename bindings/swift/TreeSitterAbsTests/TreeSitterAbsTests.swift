import XCTest
import SwiftTreeSitter
import TreeSitterAbs

final class TreeSitterAbsTests: XCTestCase {
    func testCanLoadGrammar() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_abs())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading ABS grammar")
    }
}
