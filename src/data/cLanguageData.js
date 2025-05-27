export const cFunctions = [
  "printf",
  "scanf",
  "malloc",
  "free",
  "strlen",
  "strcpy",
  "strcmp",
  "strcat",
  "fopen",
  "fclose",
  "fread",
  "fwrite",
  "getchar",
  "putchar",
];

export const cTypes = [
  "int",
  "char",
  "float",
  "double",
  "void",
  "long",
  "short",
  "unsigned",
  "signed",
  "const",
  "static",
  "extern",
  "register",
  "volatile",
];

export const createCSnippets = (monaco, range) => [
  {
    label: "for",
    kind: monaco.languages.CompletionItemKind.Snippet,
    insertText:
      "for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n\t${3:// code}\n}",
    insertTextRules:
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    range,
    detail: "for loop",
    documentation: "Standard for loop with iterator",
  },
  {
    label: "while",
    kind: monaco.languages.CompletionItemKind.Snippet,
    insertText: "while (${1:condition}) {\n\t${2:// code}\n}",
    insertTextRules:
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    range,
    detail: "while loop",
    documentation: "While loop with condition",
  },
  {
    label: "do-while",
    kind: monaco.languages.CompletionItemKind.Snippet,
    insertText: "do {\n\t${1:// code}\n} while (${2:condition});",
    insertTextRules:
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    range,
    detail: "do-while loop",
    documentation: "Do-while loop",
  },
  {
    label: "if",
    kind: monaco.languages.CompletionItemKind.Snippet,
    insertText: "if (${1:condition}) {\n\t${2:// code}\n}",
    insertTextRules:
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    range,
    detail: "if statement",
    documentation: "If conditional statement",
  },
  {
    label: "if-else",
    kind: monaco.languages.CompletionItemKind.Snippet,
    insertText:
      "if (${1:condition}) {\n\t${2:// if code}\n} else {\n\t${3:// else code}\n}",
    insertTextRules:
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    range,
    detail: "if-else statement",
    documentation: "If-else conditional statement",
  },
  {
    label: "switch",
    kind: monaco.languages.CompletionItemKind.Snippet,
    insertText:
      "switch (${1:variable}) {\n\tcase ${2:value1}:\n\t\t${3:// code}\n\t\tbreak;\n\tcase ${4:value2}:\n\t\t${5:// code}\n\t\tbreak;\n\tdefault:\n\t\t${6:// default code}\n\t\tbreak;\n}",
    insertTextRules:
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    range,
    detail: "switch statement",
    documentation: "Switch-case statement",
  },
  {
    label: "function",
    kind: monaco.languages.CompletionItemKind.Snippet,
    insertText:
      "${1:int} ${2:functionName}(${3:parameters}) {\n\t${4:// code}\n\treturn ${5:value};\n}",
    insertTextRules:
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    range,
    detail: "function definition",
    documentation: "Function definition template",
  },
  {
    label: "main",
    kind: monaco.languages.CompletionItemKind.Snippet,
    insertText: "int main() {\n\t${1:// code}\n\treturn 0;\n}",
    insertTextRules:
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    range,
    detail: "main function",
    documentation: "Main function template",
  },
  {
    label: "printf",
    kind: monaco.languages.CompletionItemKind.Snippet,
    insertText: 'printf("${1:format}", ${2:args});',
    insertTextRules:
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    range,
    detail: "printf statement",
    documentation: "Printf function call",
  },
  {
    label: "scanf",
    kind: monaco.languages.CompletionItemKind.Snippet,
    insertText: 'scanf("${1:format}", ${2:&variable});',
    insertTextRules:
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    range,
    detail: "scanf statement",
    documentation: "Scanf function call",
  },
  {
    label: "include",
    kind: monaco.languages.CompletionItemKind.Snippet,
    insertText: "#include <${1:header}>",
    insertTextRules:
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    range,
    detail: "include directive",
    documentation: "Include header file",
  },
  {
    label: "struct",
    kind: monaco.languages.CompletionItemKind.Snippet,
    insertText: "typedef struct {\n\t${1:// members}\n} ${2:StructName};",
    insertTextRules:
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    range,
    detail: "struct definition",
    documentation: "Structure definition template",
  },
];
